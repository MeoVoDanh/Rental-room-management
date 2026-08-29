import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Index() {
  const { user, isLoading, isLoggedIn } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirect based on role
  if (user?.role === UserRole.LANDLORD) {
    return <Redirect href="/(landlord)/dashboard" />;
  }

  return <Redirect href="/(tenant)/dashboard" />;
}
