import { Redirect, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (user?.role === UserRole.LANDLORD) return <Redirect href="/(landlord)/dashboard" />;
  if (user?.role === UserRole.TENANT) return <Redirect href="/(tenant)/dashboard" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
