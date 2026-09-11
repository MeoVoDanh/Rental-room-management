import os
import json
import threading
import bcrypt
from datetime import datetime, timezone
from flask import Flask, request, jsonify
import paho.mqtt.client as mqtt
from supabase import create_client, Client
from dotenv import load_dotenv

# -------------------------------------------------------------
# 1. NẠP BIẾN MÔI TRƯỜNG & KHỞI TẠO CLIENT
# -------------------------------------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
HIGH_TEMPERATURE_THRESHOLD = float(os.getenv("HIGH_TEMPERATURE_THRESHOLD", 35))
GAS_ALERT_THRESHOLD = float(os.getenv("GAS_ALERT_THRESHOLD", 2000))
DOOR_OPEN_TIMEOUT_SECONDS = int(os.getenv("DOOR_OPEN_TIMEOUT_SECONDS", 30))
NODE_OFFLINE_TIMEOUT_SECONDS = int(os.getenv("NODE_OFFLINE_TIMEOUT_SECONDS", 60))
ALERT_CHECK_INTERVAL_SECONDS = int(os.getenv("ALERT_CHECK_INTERVAL_SECONDS", 10))

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[CẢNH BÁO] Chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong file .env!")

# Khởi tạo Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Khởi tạo Flask Web Server
app = Flask(__name__)

# Thời điểm cửa bắt đầu mở được giữ trong RAM để phát hiện mở quá lâu.
door_open_since = {}
door_state_lock = threading.Lock()
pending_event_actors = {}
pending_event_lock = threading.Lock()


def utc_now():
    return datetime.now(timezone.utc)


def parse_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def log_room_event(room_id, event_type, source="system", actor_id=None,
                   actor_name="Hệ thống", description=None,
                   measured_value=None, metadata=None):
    row = {
        "room_id": str(room_id),
        "event_type": event_type,
        "source": source,
        "actor_id": actor_id,
        "actor_name": actor_name or "Hệ thống",
        "description": description,
        "measured_value": measured_value,
        "metadata": metadata or {},
        "created_at": utc_now().isoformat(),
    }
    supabase.table("room_events").insert(row).execute()
    print(f"[LỊCH SỬ] room={room_id}, event={event_type}, actor={row['actor_name']}")


def remember_event_actor(room_id, event_type, actor_id, actor_name, source):
    with pending_event_lock:
        pending_event_actors[(str(room_id), event_type)] = {
            "actor_id": actor_id,
            "actor_name": actor_name,
            "source": source,
            "expires_at": utc_now().timestamp() + 15,
        }


def take_event_actor(room_id, event_type, default_name, default_source):
    key = (str(room_id), event_type)
    with pending_event_lock:
        context = pending_event_actors.pop(key, None)
    if context and context["expires_at"] >= utc_now().timestamp():
        return context
    return {
        "actor_id": None,
        "actor_name": default_name,
        "source": default_source,
    }


def update_relay_state(room_id, relay_on):
    if not isinstance(relay_on, bool):
        return
    current = (
        supabase.table("devices")
        .select("relay_on")
        .eq("room_id", str(room_id))
        .eq("device_type", "light")
        .maybe_single()
        .execute()
    )
    previous = current.data.get("relay_on") if current.data else None
    (
        supabase.table("devices")
        .update({"relay_on": relay_on})
        .eq("room_id", str(room_id))
        .eq("device_type", "light")
        .execute()
    )
    if previous is not None and bool(previous) != relay_on:
        event_type = "light_on" if relay_on else "light_off"
        actor = take_event_actor(room_id, event_type, "Node cảm biến", "sensor_node")
        log_room_event(
            room_id, event_type, actor["source"], actor["actor_id"],
            actor["actor_name"], "Bật đèn" if relay_on else "Tắt đèn"
        )
def find_open_alert(room_id, alert_type, node_device_id=None):
    query = (
        supabase.table("alerts")
        .select("id,status")
        .eq("room_id", str(room_id))
        .eq("alert_type", alert_type)
        .in_("status", ["active", "acknowledged"])
    )
    if node_device_id:
        query = query.eq("node_device_id", node_device_id)
    result = query.limit(1).execute()
    return result.data[0] if result.data else None


def activate_alert(room_id, alert_type, message, measured_value=None,
                   threshold=None, node_device_id=None):
    """Tạo một cảnh báo nếu cùng sự cố chưa có cảnh báo đang mở."""
    if find_open_alert(room_id, alert_type, node_device_id):
        return

    row = {
        "room_id": str(room_id),
        "alert_type": alert_type,
        "status": "active",
        "message": message,
        "measured_value": measured_value,
        "threshold": threshold,
        "node_device_id": node_device_id,
    }
    # Giữ gas_value để tương thích giao diện/schema cũ.
    if alert_type == "gas_leak":
        row["gas_value"] = measured_value
    supabase.table("alerts").insert(row).execute()
    if alert_type in ("gas_leak", "high_temperature"):
        log_room_event(
            room_id,
            "gas_alert" if alert_type == "gas_leak" else "high_temperature",
            "sensor_node",
            actor_name="Node cảm biến",
            description=message,
            measured_value=measured_value,
            metadata={"threshold": threshold},
        )
    print(f"[CẢNH BÁO] room={room_id}, type={alert_type}, value={measured_value}")


def resolve_alert(room_id, alert_type, node_device_id=None):
    query = (
        supabase.table("alerts")
        .update({"status": "resolved", "resolved_at": utc_now().isoformat()})
        .eq("room_id", str(room_id))
        .eq("alert_type", alert_type)
        .in_("status", ["active", "acknowledged"])
    )
    if node_device_id:
        query = query.eq("node_device_id", node_device_id)
    query.execute()


def evaluate_telemetry(room_id, payload):
    temperature = payload.get("temperature")
    gas_raw = payload.get("gas_raw")

    if temperature is not None:
        temperature = float(temperature)
        if temperature >= HIGH_TEMPERATURE_THRESHOLD:
            activate_alert(
                room_id, "high_temperature",
                f"Nhiệt độ {temperature:.1f}°C vượt ngưỡng {HIGH_TEMPERATURE_THRESHOLD:.1f}°C",
                temperature, HIGH_TEMPERATURE_THRESHOLD,
            )
        elif temperature <= HIGH_TEMPERATURE_THRESHOLD - 1:
            resolve_alert(room_id, "high_temperature")

    if gas_raw is not None:
        gas_raw = float(gas_raw)
        if gas_raw >= GAS_ALERT_THRESHOLD:
            activate_alert(
                room_id, "gas_leak",
                f"MQ-2 đạt {gas_raw:.0f} ADC, vượt ngưỡng {GAS_ALERT_THRESHOLD:.0f} ADC",
                gas_raw, GAS_ALERT_THRESHOLD,
            )
        elif gas_raw <= GAS_ALERT_THRESHOLD * 0.9:
            resolve_alert(room_id, "gas_leak")


def evaluate_door_state(room_id, device_id, door_contact):
    key = str(room_id)
    with door_state_lock:
        if door_contact == "OPEN":
            door_open_since.setdefault(key, utc_now())
        else:
            door_open_since.pop(key, None)
            resolve_alert(room_id, "door_open_too_long")


def monitor_safety_conditions():
    """Kiểm tra cửa mở lâu và node offline theo chu kỳ."""
    while True:
        try:
            now = utc_now()
            with door_state_lock:
                open_doors = list(door_open_since.items())

            for room_id, opened_at in open_doors:
                opened_seconds = (now - opened_at).total_seconds()
                if opened_seconds >= DOOR_OPEN_TIMEOUT_SECONDS:
                    activate_alert(
                        room_id, "door_open_too_long",
                        f"Cửa đã mở quá {DOOR_OPEN_TIMEOUT_SECONDS} giây",
                        round(opened_seconds), DOOR_OPEN_TIMEOUT_SECONDS,
                    )

            nodes = (
                supabase.table("iot_nodes")
                .select("device_id,room_id,last_seen,is_online")
                .execute()
            ).data or []

            for node in nodes:
                room_id = node.get("room_id")
                if not room_id:
                    continue
                device_id = node.get("device_id")
                last_seen = parse_datetime(node.get("last_seen"))
                age = (now - last_seen).total_seconds() if last_seen else float("inf")
                is_offline = age >= NODE_OFFLINE_TIMEOUT_SECONDS

                if is_offline:
                    if node.get("is_online"):
                        supabase.table("iot_nodes").update({"is_online": False}).eq(
                            "device_id", device_id
                        ).execute()
                    activate_alert(
                        room_id, "node_offline",
                        f"Node {device_id} không gửi heartbeat trong {NODE_OFFLINE_TIMEOUT_SECONDS} giây",
                        round(age) if age != float("inf") else None,
                        NODE_OFFLINE_TIMEOUT_SECONDS,
                        device_id,
                    )
                else:
                    resolve_alert(room_id, "node_offline", device_id)
        except Exception as error:
            print(f"[LỖI Giám sát cảnh báo]: {error}")

        threading.Event().wait(ALERT_CHECK_INTERVAL_SECONDS)

# Cho phép Expo Web (localhost:8081) gọi API Flask trong giai đoạn phát triển.
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    return response

# -------------------------------------------------------------
# 2. LOGIC XỬ LÝ GIAO TIẾP MQTT
# -------------------------------------------------------------
def on_connect(client, userdata, flags, rc, properties=None):
    print(f"[*] Kết nối MQTT Broker thành công: {MQTT_BROKER}:{MQTT_PORT} (rc={rc})")
    # Đăng ký nhận toàn bộ dữ liệu từ các node phòng
    client.subscribe("smartroom/+/telemetry")
    client.subscribe("smartroom/+/alert")
    client.subscribe("smartroom/+/auth/request")
    client.subscribe("smartroom/+/ack")

    # Nhận heartbeat/trạng thái từ node cửa
    client.subscribe("smartroom/+/state")
    # Nhận thông tin đăng ký node mới từ ESP32
    client.subscribe("smartroom/nodes/register")


def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode("utf-8"))

        print(f"[MQTT Nhận] Topic: {topic} | Data: {payload}")

        # Topic này không có room_id
        if topic == "smartroom/nodes/register":
            handle_node_register(client, payload, is_retained=msg.retain)
            return

        parts = topic.split("/")

        if len(parts) < 3:
            print(f"[MQTT] Topic không hợp lệ: {topic}")
            return

        room_id = parts[1]
        channel = parts[2]

        # Giữ các đoạn xử lý state, telemetry, alert... ở dưới

        # Trạng thái và heartbeat của node cửa
        if channel == "state":
            state_data = payload.get("data", {})
            node_type = payload.get("node_type")
            device_id = payload.get("device_id")
            mac_address = payload.get("mac_address")
            now = datetime.now(timezone.utc).isoformat()
            heartbeat_data = {} if msg.retain else {"created_last_online": now}

            result = None
            if node_type == "door":
                previous_result = (
                    supabase.table("devices")
                    .select("door_contact,lock_state")
                    .eq("room_id", room_id)
                    .eq("device_type", "door_lock")
                    .maybe_single()
                    .execute()
                )
                previous_door = previous_result.data or {}
                result = (
                    supabase.table("devices")
                    .update({
                        **heartbeat_data,
                        "node_device_id": device_id,
                        "mac_address": mac_address,
                        "door_contact": state_data.get("door_contact", "UNKNOWN"),
                        "lock_state": state_data.get("lock_state", "UNKNOWN"),
                        "wifi_rssi": state_data.get("wifi_rssi")
                    })
                    .eq("room_id", room_id)
                    .eq("device_type", "door_lock")
                    .execute()
                )

                new_contact = state_data.get("door_contact")
                old_contact = previous_door.get("door_contact")
                if old_contact in ("OPEN", "CLOSED") and new_contact in ("OPEN", "CLOSED") and old_contact != new_contact:
                    event_type = "door_opened" if new_contact == "OPEN" else "door_closed"
                    log_room_event(
                        room_id, event_type, "door_sensor", actor_name="Cảm biến cửa",
                        description="Cửa đã mở" if new_contact == "OPEN" else "Cửa đã đóng"
                    )

                new_lock = state_data.get("lock_state")
                old_lock = previous_door.get("lock_state")
                if old_lock in ("LOCKED", "UNLOCKED") and new_lock in ("LOCKED", "UNLOCKED") and old_lock != new_lock:
                    event_type = "door_locked" if new_lock == "LOCKED" else "door_unlocked"
                    actor = take_event_actor(room_id, event_type, "Node cửa", "door_node")
                    log_room_event(
                        room_id, event_type, actor["source"], actor["actor_id"], actor["actor_name"],
                        "Khóa cửa" if new_lock == "LOCKED" else "Mở khóa cửa"
                    )

            elif node_type == "sensor":
                result = (
                    supabase.table("devices")
                    .update({
                        **heartbeat_data,
                        "node_device_id": device_id,
                        "mac_address": mac_address,
                        "wifi_rssi": state_data.get("wifi_rssi")
                    })
                    .eq("room_id", room_id)
                    .eq("device_type", "sensor")
                    .execute()
                )
                update_relay_state(room_id, state_data.get("relay_on"))

            # Heartbeat riêng của node, dùng để hiển thị Online/Offline theo MAC.
            if mac_address and not msg.retain:
                (
                    supabase.table("iot_nodes")
                    .update({
                        "device_id": device_id,
                        "node_type": node_type,
                        "is_online": True,
                        "last_seen": now
                    })
                    .eq("mac_address", normalize_mac(mac_address))
                    .execute()
                )

            if result is not None:
                print(f"[SUPABASE] devices updated: {result.data}")
            if node_type == "door":
                evaluate_door_state(
                    room_id,
                    device_id,
                    state_data.get("door_contact", "UNKNOWN")
                )
            print(
                f"[NODE ONLINE] room={room_id}, "
                f"device={device_id}, mac={mac_address}, "
                f"lock={state_data.get('lock_state')}, "
                f"door={state_data.get('door_contact')}"
            )

        # A. Xử lý dữ liệu cảm biến định kỳ (Telemetry)
        elif channel == "telemetry":
            supabase.table("sensor_readings").insert({
                "room_id": room_id,
                "temperature": payload.get("temperature"),
                "humidity": payload.get("humidity"),
                "gas_raw": payload.get("gas_raw")
            }).execute()
            update_relay_state(room_id, payload.get("relay_on"))
            evaluate_telemetry(room_id, payload)

        # B. Xử lý Cảnh báo an toàn (Gas rò rỉ, nhiệt độ cao, phá cửa)
        elif channel == "alert":
            alert_type = payload.get("type", "gas_leak")
            measured_value = payload.get("gas_raw", payload.get("value"))
            activate_alert(
                room_id,
                alert_type,
                payload.get("message", f"ESP32 phát hiện cảnh báo {alert_type}"),
                measured_value,
                payload.get("threshold"),
                payload.get("device_id") if alert_type == "node_offline" else None,
            )

        # C. Xử lý Yêu cầu xác thực mở cửa tại biên (RFID / PIN)
        elif channel == "auth" and len(parts) > 3 and parts[3] == "request":
            handle_auth_request(client, room_id, payload)

        # D. Xử lý Phản hồi xác nhận từ ESP32 sau khi thực thi lệnh (ACK)
        elif channel == "ack":
            command_id = payload.get("command_id")
            if command_id:
                ack_status = str(payload.get("status", "COMPLETED")).upper()
                final_status = (
                    "completed"
                    if ack_status in ("COMPLETED", "SUCCESS", "OK")
                    else "failed"
                )
                ack_result = supabase.table("control_commands").update({
                    "status": final_status,
                    "acked_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", command_id).execute()
                if ack_result.data:
                    print(f"[ACK] Lệnh {command_id} -> {final_status}")
                else:
                    print(f"[ACK] Không tìm thấy command_id={command_id} trong Supabase")

    except Exception as e:
        print(f"[LỖI Xử lý MQTT]: {e}")

def handle_auth_request(client, room_id, payload):
    request_id = payload.get("request_id")
    method = payload.get("method")  # 'rfid' hoặc 'pin'
    raw_data = payload.get("data")  # UID thẻ hoặc chuỗi mã PIN người dùng nhập

    # Truy vấn thông tin xác thực đang hoạt động của phòng trong Supabase
    res = supabase.table("access_credentials") \
        .select("*") \
        .eq("room_id", room_id) \
        .eq("credential_type", method) \
        .eq("is_active", True) \
        .execute()

    is_authorized = False
    matched_credential = None
    credentials = res.data

    if credentials and raw_data:
        for cred in credentials:
            stored_hash = cred.get("credential_hash", "").encode('utf-8')
            try:
                # Kiểm tra so khớp mã băm bcrypt
                if bcrypt.checkpw(raw_data.encode('utf-8'), stored_hash):
                    is_authorized = True
                    matched_credential = cred
                    break
            except Exception:
                continue

    # Credential hợp lệ phải mang user_id để biết chính xác ai đã mở cửa.
    access_user_id = None
    access_user_name = "Không xác định"
    if matched_credential:
        access_user_id = (
            matched_credential.get("user_id")
            or matched_credential.get("tenant_id")
            or matched_credential.get("profile_id")
        )
        if access_user_id:
            profile_result = (
                supabase.table("profiles")
                .select("full_name")
                .eq("id", access_user_id)
                .maybe_single()
                .execute()
            )
            if profile_result.data:
                access_user_name = (
                    profile_result.data.get("full_name") or "Người dùng chưa đặt tên"
                )

    if is_authorized:
        remember_event_actor(
            room_id,
            "door_unlocked",
            access_user_id,
            access_user_name,
            method or "access",
        )

    # Ghi lại lịch sử lượt quét/nhập vào bảng access_events.
    supabase.table("access_events").insert({
        "room_id": room_id,
        "method": method,
        "is_success": is_authorized,
        "user_id": access_user_id,
        "user_name": access_user_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    # Bắn bản tin phản hồi về ESP32 để kích hoạt mở chốt cửa hoặc báo đèn đỏ
    response_topic = f"smartroom/{room_id}/auth/response"
    response_payload = {
        "request_id": request_id,
        "is_authorized": is_authorized
    }
    client.publish(response_topic, json.dumps(response_payload), qos=1)


def normalize_credential_value(credential_type, value):
    value = str(value or "").strip()
    if credential_type == "rfid":
        return value.replace(":", "").replace("-", "").replace(" ", "").upper()
    return value


def require_room_landlord(actor_id, room_id):
    if not actor_id:
        return None, (jsonify({"error": "Thiếu tài khoản quản trị"}), 401)

    profile_result = (
        supabase.table("profiles")
        .select("id,role")
        .eq("id", actor_id)
        .limit(1)
        .execute()
    )
    profile = (profile_result.data or [None])[0]
    if not profile or profile.get("role") not in ("landlord", "admin"):
        return None, (jsonify({"error": "Chỉ chủ trọ được quản lý RFID/PIN"}), 403)

    room_result = (
        supabase.table("rooms")
        .select("id,landlord_id,tenant_id")
        .eq("id", str(room_id))
        .limit(1)
        .execute()
    )
    room = (room_result.data or [None])[0]
    if not room or str(room.get("landlord_id")) != str(actor_id):
        return None, (jsonify({"error": "Bạn không quản lý phòng này"}), 403)
    return room, None


@app.route("/api/rooms", methods=["POST"])
def create_room():
    try:
        data = request.get_json(silent=True) or {}
        actor_id = data.get("actor_id")
        room_id = str(data.get("room_id") or "").strip()
        display_name = str(data.get("display_name") or f"Phòng {room_id}").strip()

        if not room_id or len(room_id) > 20 or any(char.isspace() for char in room_id):
            return jsonify({"error": "Mã phòng phải từ 1-20 ký tự và không chứa khoảng trắng"}), 400
        if not display_name or len(display_name) > 80:
            return jsonify({"error": "Tên phòng phải từ 1-80 ký tự"}), 400

        profile_result = (
            supabase.table("profiles")
            .select("id,role")
            .eq("id", actor_id or "")
            .limit(1)
            .execute()
        )
        profile = (profile_result.data or [None])[0]
        if not profile or profile.get("role") not in ("landlord", "admin"):
            return jsonify({"error": "Chỉ chủ trọ mới được thêm phòng"}), 403

        existing_result = (
            supabase.table("rooms")
            .select("id,archived_at")
            .eq("id", room_id)
            .limit(1)
            .execute()
        )
        existing = (existing_result.data or [None])[0]
        if existing:
            if existing.get("archived_at"):
                return jsonify({"error": f"Phòng {room_id} đang nằm trong dữ liệu đã xóa cũ. Hãy chạy migration 007 để dọn triệt để."}), 409
            return jsonify({"error": f"Phòng {room_id} đã tồn tại"}), 409

        result = supabase.table("rooms").insert({
            "id": room_id,
            "display_name": display_name,
            "landlord_id": actor_id,
            "tenant_id": None,
            "status": "vacant",
        }).execute()

        # Thiết bị mặc định là dữ liệu tiện ích. Nếu schema thiết bị trên máy cũ
        # chưa tương thích thì vẫn giữ phòng vừa tạo và trả cảnh báo rõ ràng.
        device_warning = None
        try:
            supabase.table("devices").upsert([
                {"id": f"light_{room_id}", "room_id": room_id, "device_type": "light"},
                {"id": f"door_lock_{room_id}", "room_id": room_id, "device_type": "door_lock"},
            ], on_conflict="id").execute()
        except Exception as device_error:
            device_warning = str(device_error)
            print(f"[CẢNH BÁO tạo thiết bị phòng {room_id}]: {device_error}")

        return jsonify({"room": (result.data or [{}])[0], "warning": device_warning}), 201
    except Exception as exc:
        print(f"[LỖI tạo phòng]: {exc}")
        return jsonify({"error": f"Không tạo được phòng: {exc}"}), 500


@app.route("/api/rooms/<room_id>", methods=["PATCH", "DELETE"])
def manage_room(room_id):
    data = request.get_json(silent=True) or {}
    actor_id = data.get("actor_id") if request.method == "PATCH" else request.args.get("actor_id")
    room, error_response = require_room_landlord(actor_id, room_id)
    if error_response:
        return error_response

    if request.method == "PATCH":
        display_name = str(data.get("display_name") or "").strip()
        if not display_name or len(display_name) > 80:
            return jsonify({"error": "Tên phòng phải từ 1-80 ký tự"}), 400
        supabase.table("rooms").update({"display_name": display_name}).eq("id", str(room_id)).execute()
        return jsonify({"status": "updated", "display_name": display_name})

    if room.get("tenant_id"):
        return jsonify({"error": "Phải cho người thuê trả phòng trước khi xóa phòng"}), 409

    try:
        # Tháo node trước để node vẫn tồn tại và có thể gán sang phòng khác.
        supabase.table("iot_nodes").update({"room_id": None}).eq("room_id", str(room_id)).execute()

        # Xóa từ bảng con lên bảng cha để không vướng khóa ngoại.
        for table_name in (
            "access_credentials", "sensor_readings", "access_events",
            "control_commands", "alerts", "room_events", "devices",
        ):
            supabase.table(table_name).delete().eq("room_id", str(room_id)).execute()

        supabase.table("rooms").delete().eq("id", str(room_id)).execute()
        print(f"[PHÒNG] Đã xóa triệt để phòng {room_id}")
        return jsonify({"status": "deleted"})
    except Exception as exc:
        print(f"[LỖI xóa phòng {room_id}]: {exc}")
        return jsonify({"error": f"Không xóa được phòng: {exc}"}), 500


@app.route("/api/rooms/<room_id>/tenant", methods=["PATCH", "DELETE"])
def manage_room_tenant(room_id):
    """Gán hoặc trả phòng qua backend để không phụ thuộc RLS của ứng dụng."""
    try:
        data = request.get_json(silent=True) or {}
        actor_id = data.get("actor_id") if request.method == "PATCH" else request.args.get("actor_id")
        room, error_response = require_room_landlord(actor_id, room_id)
        if error_response:
            return error_response

        if request.method == "DELETE" or data.get("action") == "remove":
            supabase.table("rooms").update({
                "tenant_id": None,
                "status": "vacant",
            }).eq("id", str(room_id)).execute()
            print(f"[PHÒNG] Người thuê đã trả phòng {room_id}")
            return jsonify({"status": "vacant", "room_id": str(room_id)})

        tenant_id = str(data.get("tenant_id") or "").strip()
        if not tenant_id:
            return jsonify({"error": "Thiếu người thuê cần gán"}), 400

        tenant_result = (
            supabase.table("profiles")
            .select("id,role,landlord_id,full_name")
            .eq("id", tenant_id)
            .limit(1)
            .execute()
        )
        tenant = (tenant_result.data or [None])[0]
        if not tenant or tenant.get("role") != "tenant":
            return jsonify({"error": "Không tìm thấy tài khoản người thuê"}), 404

        tenant_landlord = tenant.get("landlord_id")
        if tenant_landlord and str(tenant_landlord) != str(actor_id):
            return jsonify({"error": "Người thuê không thuộc tài khoản chủ trọ này"}), 403

        occupied_result = (
            supabase.table("rooms")
            .select("id")
            .eq("tenant_id", tenant_id)
            .is_("archived_at", "null")
            .neq("id", str(room_id))
            .limit(1)
            .execute()
        )
        if occupied_result.data:
            return jsonify({
                "error": f"Người thuê đang ở Phòng {occupied_result.data[0]['id']}. Hãy trả phòng đó trước."
            }), 409

        if room.get("tenant_id") and str(room.get("tenant_id")) != tenant_id:
            return jsonify({"error": "Phòng đang có người thuê. Hãy trả phòng trước."}), 409

        # Hồ sơ cũ chưa có landlord_id sẽ được gắn với chủ trọ khi sử dụng lần đầu.
        if not tenant_landlord:
            supabase.table("profiles").update({"landlord_id": actor_id}).eq("id", tenant_id).execute()

        supabase.table("rooms").update({
            "tenant_id": tenant_id,
            "status": "occupied",
        }).eq("id", str(room_id)).execute()
        print(f"[PHÒNG] Đã gán {tenant_id} vào phòng {room_id}")
        return jsonify({
            "status": "occupied",
            "room_id": str(room_id),
            "tenant_id": tenant_id,
            "tenant_name": tenant.get("full_name"),
        })
    except Exception as exc:
        print(f"[LỖI gán/trả phòng {room_id}]: {exc}")
        return jsonify({"error": f"Không cập nhật được người thuê: {exc}"}), 500


@app.route("/api/tenants", methods=["GET"])
def list_tenants():
    """Danh sách người thuê và phòng hiện tại của một chủ trọ."""
    try:
        actor_id = request.args.get("actor_id")
        actor_result = (
            supabase.table("profiles")
            .select("id,role")
            .eq("id", actor_id or "")
            .limit(1)
            .execute()
        )
        actor = (actor_result.data or [None])[0]
        if not actor or actor.get("role") not in ("landlord", "admin"):
            return jsonify({"error": "Chỉ chủ trọ được xem danh sách người thuê"}), 403

        profiles_result = (
            supabase.table("profiles")
            .select("id,full_name,phone,email,created_at")
            .eq("role", "tenant")
            .eq("landlord_id", actor_id)
            .order("created_at", desc=True)
            .execute()
        )
        rooms_result = (
            supabase.table("rooms")
            .select("id,tenant_id")
            .eq("landlord_id", actor_id)
            .is_("archived_at", "null")
            .execute()
        )
        room_by_tenant = {
            str(room.get("tenant_id")): str(room.get("id"))
            for room in rooms_result.data or []
            if room.get("tenant_id")
        }
        tenants = [{
            "id": str(profile["id"]),
            "full_name": profile.get("full_name") or "Chưa đặt tên",
            "phone": profile.get("phone") or "",
            "email": profile.get("email") or "",
            "assigned_room_id": room_by_tenant.get(str(profile["id"])),
            "created_at": profile.get("created_at"),
        } for profile in profiles_result.data or []]
        return jsonify({"tenants": tenants})
    except Exception as exc:
        print(f"[LỖI lấy danh sách người thuê]: {exc}")
        return jsonify({"error": f"Không lấy được danh sách người thuê: {exc}"}), 500


def serialize_credentials(rows):
    user_ids = list({row.get("user_id") for row in rows if row.get("user_id")})
    names = {}
    if user_ids:
        profiles = supabase.table("profiles").select("id,full_name").in_("id", user_ids).execute()
        names = {str(item["id"]): item.get("full_name") or "Người thuê" for item in profiles.data or []}
    return [{
        "id": str(row["id"]),
        "roomId": str(row["room_id"]),
        "userId": str(row.get("user_id") or ""),
        "userName": names.get(str(row.get("user_id")), "Không xác định"),
        "type": row["credential_type"],
        "isActive": bool(row.get("is_active")),
        "createdAt": row.get("created_at"),
    } for row in rows]


@app.route("/api/rooms/<room_id>/credentials", methods=["GET", "POST"])
def room_credentials(room_id):
    data = request.get_json(silent=True) or {}
    actor_id = request.args.get("actor_id") if request.method == "GET" else data.get("actor_id")
    room, error_response = require_room_landlord(actor_id, room_id)
    if error_response:
        return error_response

    if request.method == "GET":
        result = (
            supabase.table("access_credentials")
            .select("id,room_id,user_id,credential_type,is_active,created_at")
            .eq("room_id", str(room_id))
            .order("created_at", desc=True)
            .execute()
        )
        return jsonify({"credentials": serialize_credentials(result.data or [])})

    user_id = data.get("user_id")
    credential_type = str(data.get("credential_type") or "").lower()
    raw_value = normalize_credential_value(credential_type, data.get("credential_value"))

    if credential_type not in ("rfid", "pin"):
        return jsonify({"error": "Loại quyền phải là RFID hoặc PIN"}), 400
    if not raw_value:
        return jsonify({"error": "Mã RFID/PIN không được để trống"}), 400
    if credential_type == "pin" and (not raw_value.isdigit() or not 4 <= len(raw_value) <= 8):
        return jsonify({"error": "PIN phải gồm từ 4 đến 8 chữ số"}), 400
    if str(room.get("tenant_id") or "") != str(user_id or ""):
        return jsonify({"error": "Chỉ được gán quyền cho người thuê hiện tại của phòng"}), 400

    existing = (
        supabase.table("access_credentials")
        .select("id,credential_hash")
        .eq("room_id", str(room_id))
        .eq("credential_type", credential_type)
        .execute()
    )
    for item in existing.data or []:
        try:
            if bcrypt.checkpw(raw_value.encode("utf-8"), item["credential_hash"].encode("utf-8")):
                return jsonify({"error": "RFID/PIN này đã được gán trong phòng"}), 409
        except (ValueError, TypeError, AttributeError):
            continue

    credential_hash = bcrypt.hashpw(raw_value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    result = supabase.table("access_credentials").insert({
        "room_id": str(room_id),
        "user_id": user_id,
        "credential_type": credential_type,
        "credential_hash": credential_hash,
        "is_active": True,
    }).execute()
    return jsonify({"credential": serialize_credentials(result.data or [])[0]}), 201


def credential_room_and_permission(credential_id, actor_id):
    credential = (
        supabase.table("access_credentials")
        .select("id,room_id")
        .eq("id", credential_id)
        .maybe_single()
        .execute()
    )
    if not credential.data:
        return None, (jsonify({"error": "Không tìm thấy quyền truy cập"}), 404)
    _, error_response = require_room_landlord(actor_id, credential.data["room_id"])
    return credential.data, error_response


def require_tenant_landlord(actor_id, tenant_id):
    actor_result = supabase.table("profiles").select("id,role").eq("id", actor_id or "").limit(1).execute()
    actor = (actor_result.data or [None])[0]
    if not actor or actor.get("role") not in ("landlord", "admin"):
        return None, (jsonify({"error": "Chỉ chủ trọ được quản lý người thuê"}), 403)

    tenant_result = (
        supabase.table("profiles")
        .select("id,role,landlord_id,full_name,email,phone")
        .eq("id", tenant_id)
        .limit(1)
        .execute()
    )
    tenant = (tenant_result.data or [None])[0]
    if not tenant or tenant.get("role") != "tenant":
        return None, (jsonify({"error": "Không tìm thấy người thuê"}), 404)
    if str(tenant.get("landlord_id") or "") != str(actor_id):
        return None, (jsonify({"error": "Người thuê không thuộc tài khoản chủ trọ này"}), 403)
    return tenant, None


@app.route("/api/tenants/<tenant_id>", methods=["PATCH", "DELETE"])
def manage_tenant(tenant_id):
    try:
        data = request.get_json(silent=True) or {}
        actor_id = data.get("actor_id") if request.method == "PATCH" else request.args.get("actor_id")
        tenant, error_response = require_tenant_landlord(actor_id, tenant_id)
        if error_response:
            return error_response

        if request.method == "PATCH":
            full_name = str(data.get("full_name") or "").strip()
            phone = str(data.get("phone") or "").strip()
            email = str(data.get("email") or "").strip().lower()
            if not full_name:
                return jsonify({"error": "Họ tên không được để trống"}), 400
            if "@" not in email:
                return jsonify({"error": "Email không hợp lệ"}), 400

            if email != str(tenant.get("email") or "").lower():
                supabase.auth.admin.update_user_by_id(tenant_id, {"email": email, "email_confirm": True})
            supabase.table("profiles").update({
                "full_name": full_name,
                "phone": phone,
                "email": email,
            }).eq("id", tenant_id).execute()
            return jsonify({"status": "updated"})

        # Trả tất cả phòng trước, thu hồi quyền rồi xóa tài khoản đăng nhập.
        supabase.table("rooms").update({"tenant_id": None, "status": "vacant"}).eq("tenant_id", tenant_id).execute()
        supabase.table("access_credentials").delete().eq("user_id", tenant_id).execute()
        supabase.auth.admin.delete_user(tenant_id)
        # Một số schema không cascade auth.users -> profiles, nên xóa dự phòng.
        supabase.table("profiles").delete().eq("id", tenant_id).execute()
        print(f"[NGƯỜI THUÊ] Đã xóa tài khoản {tenant_id}")
        return jsonify({"status": "deleted"})
    except Exception as exc:
        print(f"[LỖI quản lý người thuê]: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/credentials/<credential_id>", methods=["PATCH", "DELETE"])
def manage_credential(credential_id):
    data = request.get_json(silent=True) or {}
    actor_id = data.get("actor_id") if request.method == "PATCH" else request.args.get("actor_id")
    credential, error_response = credential_room_and_permission(credential_id, actor_id)
    if error_response:
        return error_response

    if request.method == "DELETE":
        supabase.table("access_credentials").delete().eq("id", credential_id).execute()
        return jsonify({"status": "deleted"})

    is_active = data.get("is_active")
    if not isinstance(is_active, bool):
        return jsonify({"error": "is_active phải là true hoặc false"}), 400
    supabase.table("access_credentials").update({"is_active": is_active}).eq("id", credential_id).execute()
    return jsonify({"status": "updated", "is_active": is_active})

# Khởi tạo MQTT Client instance
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def start_mqtt_loop():
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    mqtt_client.loop_forever()

# -------------------------------------------------------------
# 3. REST API DÀNH CHO APP EXPO / FRONTEND GỬI LỆNH ĐIỀU KHIỂN
# -------------------------------------------------------------
def can_control_room(user_id, room_id):
    if not user_id:
        return False, "Thiếu thông tin người điều khiển"

    profile = (
        supabase.table("profiles")
        .select("id,role,full_name")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    room = (
        supabase.table("rooms")
        .select("id,landlord_id,tenant_id")
        .eq("id", str(room_id))
        .maybe_single()
        .execute()
    )
    if not profile.data or not room.data:
        return False, "Không tìm thấy tài khoản hoặc phòng"

    role = profile.data.get("role")
    if role in ("landlord", "admin"):
        allowed = str(room.data.get("landlord_id") or "") == str(user_id)
    elif role == "tenant":
        allowed = str(room.data.get("tenant_id") or "") == str(user_id)
    else:
        allowed = False

    return allowed, None if allowed else "Bạn không có quyền điều khiển phòng này"


def clamp_event_limit(raw_limit):
    try:
        return max(1, min(int(raw_limit or 100), 200))
    except (TypeError, ValueError):
        return 100


@app.route("/api/rooms/<room_id>/events", methods=["GET"])
def get_room_event_history(room_id):
    """Lịch sử một phòng dành cho chủ trọ hoặc người thuê của chính phòng đó."""
    try:
        user_id = request.args.get("user_id")
        allowed, permission_error = can_control_room(user_id, room_id)
        if not allowed:
            return jsonify({"error": permission_error}), 403

        result = (
            supabase.table("room_events")
            .select("*")
            .eq("room_id", str(room_id))
            .order("created_at", desc=True)
            .limit(clamp_event_limit(request.args.get("limit")))
            .execute()
        )
        return jsonify({"events": result.data or []})
    except Exception as exc:
        print(f"[LỖI API lịch sử phòng {room_id}]: {exc}")
        return jsonify({"error": "Không tải được lịch sử sự kiện phòng"}), 500


@app.route("/api/events", methods=["GET"])
def get_landlord_event_history():
    """Lịch sử tổng hợp tất cả phòng thuộc tài khoản chủ trọ/admin."""
    try:
        user_id = request.args.get("user_id")
        profile = (
            supabase.table("profiles")
            .select("id,role")
            .eq("id", user_id or "")
            .maybe_single()
            .execute()
        )
        if not profile.data or profile.data.get("role") not in ("landlord", "admin"):
            return jsonify({"error": "Chỉ chủ trọ mới được xem lịch sử tổng"}), 403

        rooms_result = (
            supabase.table("rooms")
            .select("id")
            .eq("landlord_id", user_id)
            .execute()
        )
        room_ids = [str(room["id"]) for room in (rooms_result.data or [])]
        if not room_ids:
            return jsonify({"events": []})

        result = (
            supabase.table("room_events")
            .select("*")
            .in_("room_id", room_ids)
            .order("created_at", desc=True)
            .limit(clamp_event_limit(request.args.get("limit")))
            .execute()
        )
        return jsonify({"events": result.data or []})
    except Exception as exc:
        print(f"[LỖI API lịch sử tổng]: {exc}")
        return jsonify({"error": "Không tải được lịch sử tổng"}), 500


@app.route("/api/control", methods=["POST"])
def send_device_control():
    try:
        data = request.json
        room_id = data.get("room_id")
        device_id = data.get("device_id")  # Ví dụ: 'door_servo', 'light_relay', 'fan_relay'
        command = data.get("command")      # Ví dụ: 'DOOR_UNLOCK', 'LIGHT_ON', 'FAN_OFF'
        user_id = data.get("user_id")

        if not all([room_id, device_id, command]):
            return jsonify({"error": "Thiếu thông tin điều khiển bắt buộc"}), 400

        allowed, permission_error = can_control_room(user_id, room_id)
        if not allowed:
            return jsonify({"error": permission_error}), 403

        command_devices = {
            "toggle_light_on": f"light_{room_id}",
            "toggle_light_off": f"light_{room_id}",
            "unlock_door": f"door_lock_{room_id}",
            "lock_door": f"door_lock_{room_id}",
        }
        if command not in command_devices or device_id != command_devices[command]:
            return jsonify({"error": "Thiết bị hoặc lệnh không hợp lệ"}), 400

        issuer_name = "Hệ thống"
        if user_id:
            profile_result = (
                supabase.table("profiles")
                .select("full_name")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            if profile_result.data:
                issuer_name = profile_result.data.get("full_name") or "Người dùng chưa đặt tên"

        # 1. Ghi log lệnh vào Supabase (Trạng thái khởi tạo: pending)
        db_res = supabase.table("control_commands").insert({
            "room_id": room_id,
            "device_id": device_id,
            "command": command,
            "status": "pending",
            "created_by": user_id,
            "issuer_name": issuer_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        command_id = db_res.data[0]["id"]

        action_map = {
            "toggle_light_on": "relay_on",
            "toggle_light_off": "relay_off",
            "unlock_door": "unlock",
            "lock_door": "lock"
        }
        action = action_map.get(command, command)

        # 2. Publish xuống MQTT. `command` dùng cho lịch sử web,
        # còn `action` là lệnh ngắn mà firmware ESP32 thực thi.
        topic = f"smartroom/{room_id}/control"
        msg = {
            "command_id": command_id,
            "device_id": device_id,
            "command": command,
            "action": action
        }
        event_map = {
            "toggle_light_on": "light_on",
            "toggle_light_off": "light_off",
            "unlock_door": "door_unlocked",
            "lock_door": "door_locked",
        }
        if not mqtt_client.is_connected():
            return jsonify({"error": "Backend chưa kết nối MQTT Broker"}), 503

        remember_event_actor(
            room_id,
            event_map[command],
            user_id,
            issuer_name,
            "web_control",
        )
        publish_info = mqtt_client.publish(topic, json.dumps(msg), qos=1)
        if publish_info.rc != mqtt.MQTT_ERR_SUCCESS:
            return jsonify({"error": "Không publish được lệnh MQTT"}), 503

        return jsonify({
            "status": "success",
            "message": "Lệnh đã được chuyển tới MQTT Broker",
            "command_id": command_id,
            "command": db_res.data[0]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------------------------------------
# 5. XỬ LÝ ĐĂNG KÝ VÀ GÁN NODE THEO MAC
# -------------------------------------------------------------
def normalize_mac(value):
    return str(value or "").replace(":", "").replace("-", "").strip().upper()


def publish_node_config(client, mac_address, room_id):
    config_topic = f"smartroom/nodes/{mac_address}/config"
    config_payload = {"room_id": str(room_id)}
    info = client.publish(
        config_topic,
        json.dumps(config_payload),
        qos=1,
        retain=True
    )
    return info.rc == mqtt.MQTT_ERR_SUCCESS


def handle_node_register(client, payload, is_retained=False):
    mac_address = normalize_mac(payload.get("mac_address"))
    device_id = payload.get("device_id")
    node_type = payload.get("node_type")

    if not mac_address or not device_id or not node_type:
        print("[NODE] Thông tin đăng ký không hợp lệ")
        return

    # Tìm node theo MAC
    result = (
        supabase.table("iot_nodes")
        .select("*")
        .eq("mac_address", mac_address)
        .maybe_single()
        .execute()
    )

    node = result.data

    # Nếu MAC chưa có thì lưu ở trạng thái chờ gán phòng
    if not node:
        insert_result = (
            supabase.table("iot_nodes")
            .insert({
                "mac_address": mac_address,
                "device_id": device_id,
                "node_type": node_type,
                "room_id": None,
                "is_online": not is_retained,
                "last_seen": None if is_retained else datetime.now(timezone.utc).isoformat()
            })
            .execute()
        )

        print(f"[NODE] MAC mới đang chờ gán phòng: {mac_address}")
        return

    # Retained registration có thể là bản tin cũ nên không dùng nó làm heartbeat.
    update_data = {"device_id": device_id, "node_type": node_type}
    if not is_retained:
        update_data.update({
            "is_online": True,
            "last_seen": datetime.now(timezone.utc).isoformat()
        })
    supabase.table("iot_nodes").update(update_data).eq("mac_address", mac_address).execute()

    room_id = node.get("room_id")

    if not room_id:
        print(f"[NODE] MAC {mac_address} chưa được gán phòng")
        return

    publish_node_config(client, mac_address, room_id)

    print(
        f"[NODE] Đã gán {mac_address} "
        f"({node_type}) vào phòng {room_id}"
    )


@app.route("/api/nodes", methods=["GET", "POST"])
def list_iot_nodes():
    try:
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            actor_id = data.get("actor_id")
            room_id = str(data.get("room_id") or "").strip()
            mac_address = normalize_mac(data.get("mac_address"))
            node_type = str(data.get("node_type") or "").lower().strip()

            _, error_response = require_room_landlord(actor_id, room_id)
            if error_response:
                return error_response
            if len(mac_address) != 12 or any(char not in "0123456789ABCDEF" for char in mac_address):
                return jsonify({"error": "MAC phải gồm đúng 12 ký tự hệ hexadecimal"}), 400
            if node_type not in ("door", "sensor"):
                return jsonify({"error": "Loại node chỉ được là door hoặc sensor"}), 400

            existing_result = supabase.table("iot_nodes").select("id").eq("mac_address", mac_address).limit(1).execute()
            if existing_result.data:
                return jsonify({"error": "Địa chỉ MAC này đã tồn tại"}), 409

            device_id = f"{node_type}-{mac_address}"
            result = supabase.table("iot_nodes").insert({
                "mac_address": mac_address,
                "device_id": device_id,
                "node_type": node_type,
                "room_id": room_id,
                "is_online": False,
                "last_seen": None,
            }).execute()
            mqtt_sent = publish_node_config(mqtt_client, mac_address, room_id)
            return jsonify({"node": (result.data or [{}])[0], "mqtt_sent": mqtt_sent}), 201

        result = (
            supabase.table("iot_nodes")
            .select("*")
            .order("created_at", desc=False)
            .execute()
        )
        return jsonify({"nodes": result.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/nodes/<node_id>", methods=["PATCH", "DELETE"])
def manage_iot_node(node_id):
    try:
        result = supabase.table("iot_nodes").select("*").eq("id", node_id).limit(1).execute()
        node = (result.data or [None])[0]
        if not node:
            return jsonify({"error": "Không tìm thấy node"}), 404

        data = request.get_json(silent=True) or {}
        actor_id = data.get("actor_id") if request.method == "PATCH" else request.args.get("actor_id")
        room_id = str(node.get("room_id") or "")
        if not room_id:
            return jsonify({"error": "Node chưa thuộc phòng nào"}), 409
        _, error_response = require_room_landlord(actor_id, room_id)
        if error_response:
            return error_response

        if request.method == "DELETE":
            permanent = request.args.get("permanent", "false").lower() == "true"
            if permanent:
                supabase.table("iot_nodes").delete().eq("id", node_id).execute()
                return jsonify({"status": "deleted"})
            update_result = supabase.table("iot_nodes").update({"room_id": None}).eq("id", node_id).execute()
            publish_node_config(mqtt_client, node["mac_address"], "")
            return jsonify({"status": "unassigned", "node": (update_result.data or [{}])[0]})

        mac_address = normalize_mac(data.get("mac_address"))
        node_type = str(data.get("node_type") or "").lower().strip()
        if len(mac_address) != 12 or any(char not in "0123456789ABCDEF" for char in mac_address):
            return jsonify({"error": "MAC phải gồm đúng 12 ký tự hệ hexadecimal"}), 400
        if node_type not in ("door", "sensor"):
            return jsonify({"error": "Loại node chỉ được là door hoặc sensor"}), 400

        duplicate = supabase.table("iot_nodes").select("id").eq("mac_address", mac_address).neq("id", node_id).limit(1).execute()
        if duplicate.data:
            return jsonify({"error": "Địa chỉ MAC này đã được node khác sử dụng"}), 409

        update_result = supabase.table("iot_nodes").update({
            "mac_address": mac_address,
            "node_type": node_type,
            "device_id": f"{node_type}-{mac_address}",
        }).eq("id", node_id).execute()
        publish_node_config(mqtt_client, mac_address, room_id)
        return jsonify({"node": (update_result.data or [{}])[0]})
    except Exception as e:
        print(f"[LỖI quản lý node]: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/nodes/assign", methods=["POST"])
def assign_iot_node():
    try:
        data = request.get_json(silent=True) or {}
        mac_address = normalize_mac(data.get("mac_address"))
        room_id = str(data.get("room_id") or "").strip()

        if len(mac_address) != 12 or not room_id:
            return jsonify({"error": "MAC hoặc room_id không hợp lệ"}), 400

        room_result = (
            supabase.table("rooms")
            .select("id")
            .eq("id", room_id)
            .is_("archived_at", "null")
            .maybe_single()
            .execute()
        )
        if not room_result.data:
            return jsonify({"error": f"Phòng {room_id} không tồn tại"}), 404

        node_result = (
            supabase.table("iot_nodes")
            .select("*")
            .eq("mac_address", mac_address)
            .maybe_single()
            .execute()
        )
        if not node_result.data:
            return jsonify({"error": "MAC chưa đăng ký với backend"}), 404

        update_result = (
            supabase.table("iot_nodes")
            .update({"room_id": room_id})
            .eq("mac_address", mac_address)
            .execute()
        )

        if not publish_node_config(mqtt_client, mac_address, room_id):
            return jsonify({"error": "Đã lưu phòng nhưng chưa gửi được MQTT config"}), 503

        print(f"[NODE] Web đã gán {mac_address} vào phòng {room_id}")
        return jsonify({"node": update_result.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# -------------------------------------------------------------
# 4. KHỞI CHẠY MÁY CHỦ
# -------------------------------------------------------------

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "message": "Smart Room Server is running perfectly!"
    }), 200

    
if __name__ == "__main__":
    # Khởi chạy luồng MQTT Client chạy ngầm
    mqtt_thread = threading.Thread(target=start_mqtt_loop, daemon=True)
    mqtt_thread.start()

    alert_thread = threading.Thread(target=monitor_safety_conditions, daemon=True)
    alert_thread.start()

    # Chạy Flask Server trên port 5000
    app.run(host="0.0.0.0", port=5000, debug=False)
