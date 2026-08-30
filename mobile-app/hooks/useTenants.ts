import { useState, useEffect, useCallback } from 'react';
import { getTenants, createTenantOnly, assignTenantToRoom, removeTenantFromRoom, TenantItem } from '@/services/tenantService';

export function useTenants() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải danh sách người thuê');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const createTenant = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => {
    const res = await createTenantOnly(params);
    await fetchTenants();
    return res;
  };

  const assign = async (roomId: string, tenantId: string, landlordId?: string) => {
    await assignTenantToRoom(roomId, tenantId, landlordId);
    await fetchTenants();
  };

  const remove = async (roomId: string) => {
    await removeTenantFromRoom(roomId);
    await fetchTenants();
  };

  return {
    tenants,
    isLoading,
    error,
    refetch: fetchTenants,
    createTenant,
    assignToRoom: assign,
    removeFromRoom: remove,
  };
}
