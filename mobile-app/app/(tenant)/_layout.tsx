import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TenantLayout() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const iosBottomInset = Platform.OS === 'ios' ? insets.bottom : 0;
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== UserRole.TENANT) return <Redirect href="/(landlord)/dashboard" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          height: 60 + iosBottomInset,
          paddingBottom: Math.max(8, iosBottomInset - 6),
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Phòng',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="controls"
        options={{
          title: 'Điều khiển',
          tabBarIcon: ({ color, size }) => <Ionicons name="toggle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
