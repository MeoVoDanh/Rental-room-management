import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types';
import { getTenantRoomIds } from '@/services/roomService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  /** Lỗi xảy ra sau khi auth thành công nhưng build profile thất bại */
  authError: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole
  ) => Promise<void>;
  selectAssignedRoom: (roomId: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  authError: null,
  login: async () => ({} as User),
  register: async () => {},
  selectAssignedRoom: () => {},
  logout: async () => {},
});

let tenantRoomChannelSequence = 0;

async function buildUser(supabaseUser: any): Promise<User> {
  // Lấy profile từ bảng profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  if (error || !profile) {
    throw new Error(
      'Không tìm thấy hồ sơ người dùng trong hệ thống. ' +
      'Vui lòng liên hệ quản trị viên hoặc dùng màn hình Đăng ký.'
    );
  }

  // Dữ liệu cũ có thể dùng role "admin"; trên app xem admin là chủ trọ.
  const role = profile.role === 'admin' ? UserRole.LANDLORD : profile.role as UserRole;
  let assignedRoomId: string | undefined;
  let assignedRoomIds: string[] = [];

  if (role === UserRole.TENANT) {
    assignedRoomIds = await getTenantRoomIds(supabaseUser.id);
    assignedRoomId = assignedRoomIds[0];
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    fullName: profile.full_name ?? '',
    phone: profile.phone ?? '',
    role,
    assignedRoomId,
    assignedRoomIds,
  };
}

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email hoặc mật khẩu không đúng';
  if (msg.includes('Email not confirmed'))
    return 'Email chưa được xác nhận. Vào Supabase Dashboard → Authentication → Settings → tắt "Enable email confirmations".';
  if (msg.includes('Too many requests')) return 'Quá nhiều lần thử. Vui lòng đợi vài phút.';
  if (msg.includes('User not found')) return 'Tài khoản không tồn tại';
  return msg;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Khôi phục session hiện tại khi app khởi động
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const u = await buildUser(session.user);
          setUser(u);
        } catch {
          // Session cũ nhưng không có profile → xóa session
          await supabase.auth.signOut();
        }
      }
      setIsLoading(false);
    });

    // Lắng nghe auth state — CHỈ xử lý SIGNED_OUT ở đây
    // SIGNED_IN được xử lý trong login() để có thể bubble error lên UI
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setAuthError(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Phòng của người thuê có thể được chủ trọ gán/gỡ sau khi họ đã đăng nhập.
  // Đồng bộ lại để các màn Điều khiển/Lịch sử không giữ assignedRoomId cũ.
  useEffect(() => {
    if (!user || user.role !== UserRole.TENANT) return;

    const syncAssignedRooms = async () => {
      try {
        const nextRoomIds = await getTenantRoomIds(user.id);
        setUser((current) => {
          if (!current || current.id !== user.id) return current;
          const nextRoomId = current.assignedRoomId && nextRoomIds.includes(current.assignedRoomId)
            ? current.assignedRoomId
            : nextRoomIds[0];
          const unchanged = current.assignedRoomId === nextRoomId &&
            JSON.stringify(current.assignedRoomIds ?? []) === JSON.stringify(nextRoomIds);
          return unchanged ? current : { ...current, assignedRoomId: nextRoomId, assignedRoomIds: nextRoomIds };
        });
      } catch (error) {
        // Đồng bộ nền có thể thất bại tạm thời do mạng. Giữ dữ liệu hiện tại và
        // thử lại ở lần polling/realtime tiếp theo, không tạo unhandled Promise.
        console.warn('[TENANT ROOMS] Tạm thời chưa đồng bộ được danh sách phòng', error);
      }
    };

    syncAssignedRooms();
    const interval = setInterval(syncAssignedRooms, 3000);
    tenantRoomChannelSequence += 1;
    const channel = supabase
      .channel(`tenant-room-${user.id}-${tenantRoomChannelSequence}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, syncAssignedRooms)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  const selectAssignedRoom = useCallback((roomId: string) => {
    setUser((current) => {
      if (!current?.assignedRoomIds?.includes(roomId)) return current;
      return { ...current, assignedRoomId: roomId };
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setAuthError(null);

    // Bước 1: xác thực với Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = translateAuthError(authError.message);
      setAuthError(msg);
      throw new Error(msg);
    }

    if (!authData.user) {
      const msg = 'Không lấy được thông tin tài khoản';
      setAuthError(msg);
      throw new Error(msg);
    }

    // Bước 2: build user từ bảng profiles
    try {
      setIsLoading(true);
      const u = await buildUser(authData.user);
      setUser(u);
      setAuthError(null);
      return u;
    } catch (e: any) {
      // Auth OK nhưng không có profile → đăng xuất để tránh orphan session
      await supabase.auth.signOut();
      const msg = e.message ?? 'Lỗi tải thông tin người dùng';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone: string,
      role: UserRole
    ) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(translateAuthError(error.message));

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          phone,
          role,
        });
        if (profileError) throw profileError;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        authError,
        login,
        register,
        selectAssignedRoom,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
