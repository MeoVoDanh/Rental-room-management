import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types';
import { getTenantRoom } from '@/services/roomService';

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  authError: null,
  login: async () => ({} as User),
  register: async () => {},
  logout: async () => {},
});

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

  const role = profile.role as UserRole;
  let assignedRoomId: string | undefined;

  if (role === UserRole.TENANT) {
    const room = await getTenantRoom(supabaseUser.id);
    assignedRoomId = room?.id;
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    fullName: profile.full_name ?? '',
    phone: profile.phone ?? '',
    role,
    assignedRoomId,
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
