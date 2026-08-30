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

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[CẢNH BÁO] Chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong file .env!")

# Khởi tạo Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Khởi tạo Flask Web Server
app = Flask(__name__)

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

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode('utf-8'))
        parts = topic.split('/')
        
        # Topic format: smartroom/{room_id}/{channel}
        room_id = parts[1]
        channel = parts[2]

        print(f"[MQTT Nhận] Topic: {topic} | Data: {payload}")

        # A. Xử lý dữ liệu cảm biến định kỳ (Telemetry)
        if channel == "telemetry":
            supabase.table("sensor_readings").insert({
                "room_id": room_id,
                "temperature": payload.get("temperature"),
                "humidity": payload.get("humidity"),
                "gas_raw": payload.get("gas_raw")
            }).execute()

        # B. Xử lý Cảnh báo an toàn (Gas rò rỉ, nhiệt độ cao, phá cửa)
        elif channel == "alert":
            supabase.table("alerts").insert({
                "room_id": room_id,
                "alert_type": payload.get("type", "gas_leak"),
                "gas_value": payload.get("gas_raw"),
                "threshold": payload.get("threshold"),
                "status": "pending"
            }).execute()

        # C. Xử lý Yêu cầu xác thực mở cửa tại biên (RFID / PIN)
        elif channel == "auth" and len(parts) > 3 and parts[3] == "request":
            handle_auth_request(client, room_id, payload)

        # D. Xử lý Phản hồi xác nhận từ ESP32 sau khi thực thi lệnh (ACK)
        elif channel == "ack":
            command_id = payload.get("command_id")
            if command_id:
                supabase.table("control_commands").update({
                    "status": "completed",
                    "acked_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", command_id).execute()

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
    credentials = res.data

    if credentials and raw_data:
        for cred in credentials:
            stored_hash = cred.get("credential_hash", "").encode('utf-8')
            try:
                # Kiểm tra so khớp mã băm bcrypt
                if bcrypt.checkpw(raw_data.encode('utf-8'), stored_hash):
                    is_authorized = True
                    break
            except Exception:
                continue

    # Ghi lại lịch sử lượt quét/nhập vào bảng access_events
    supabase.table("access_events").insert({
        "room_id": room_id,
        "method": method,
        "is_success": is_authorized
    }).execute()

    # Bắn bản tin phản hồi về ESP32 để kích hoạt mở chốt cửa hoặc báo đèn đỏ
    response_topic = f"smartroom/{room_id}/auth/response"
    response_payload = {
        "request_id": request_id,
        "is_authorized": is_authorized
    }
    client.publish(response_topic, json.dumps(response_payload), qos=1)

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

        # 1. Ghi log lệnh vào Supabase (Trạng thái khởi tạo: pending)
        db_res = supabase.table("control_commands").insert({
            "room_id": room_id,
            "device_id": device_id,
            "command": command,
            "status": "pending",
            "created_by": user_id
        }).execute()

        command_id = db_res.data[0]["id"]

        # 2. Publish bản tin MQTT xuống cho ESP32 của phòng tương ứng
        topic = f"smartroom/{room_id}/control"
        msg = {
            "command_id": command_id,
            "device_id": device_id,
            "command": command
        }
        mqtt_client.publish(topic, json.dumps(msg), qos=1)

        return jsonify({
            "status": "success",
            "message": "Lệnh đã được chuyển tới MQTT Broker",
            "command_id": command_id
        }), 200

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

    # Chạy Flask Server trên port 5000
    app.run(host="0.0.0.0", port=5000, debug=False)