import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY trong mobile-app/.env",
  );
}

// Expo Router static render chạy trong Node.js nên chưa có window.
const isWebServer = Platform.OS === "web" && typeof window === "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Chỉ dùng AsyncStorage khi đã chạy trên thiết bị hoặc trình duyệt.
    ...(isWebServer ? {} : { storage: AsyncStorage }),

    autoRefreshToken: !isWebServer,
    persistSession: !isWebServer,

    // Mobile không đọc callback đăng nhập từ URL.
    detectSessionInUrl: Platform.OS === "web" && !isWebServer,
  },
});
