import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getTenants, createTenantOnly, assignTenantToRoom, removeTenantFromRoom, TenantItem, updateTenant, deleteTenant } from '@/services/tenantService';

let tenantChannelSequence = 0;

export function useTenants(landlordId?: string) {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      if (!landlordId) { setTenants([]); return; }
      const data = await getTenants(landlordId);
      setTenants(data);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải danh sách người thuê');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    fetchTenants(true);
    if (!landlordId) return;

    tenantChannelSequence += 1;
    const channel = supabase
      .channel(`tenant-room-status-${landlordId}-${tenantChannelSequence}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `landlord_id=eq.${landlordId}` },
        () => fetchTenants(false)
      )
      .subscribe();
    const interval = setInterval(() => fetchTenants(false), 3000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchTenants(false);
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [fetchTenants, landlordId]);

  const createTenant = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    landlordId: string;
  }) => {
    const res = await createTenantOnly(params);
    await fetchTenants();
    return res;
  };

  const update = async (params: { actorId: string; tenantId: string; fullName: string; phone: string; email: string }) => {
    await updateTenant(params); await fetchTenants();
  };

  const deleteItem = async (actorId: string, tenantId: string) => {
    await deleteTenant(actorId, tenantId); await fetchTenants();
  };

  const assign = async (roomId: string, tenantId: string) => {
    if (!landlordId) throw new Error('Thiếu thông tin chủ trọ');
    await assignTenantToRoom(roomId, tenantId, landlordId);
    await fetchTenants();
  };

  const remove = async (roomId: string) => {
    if (!landlordId) throw new Error('Thiếu thông tin chủ trọ');
    await removeTenantFromRoom(roomId, landlordId);
    await fetchTenants();
  };

  return {
    tenants,
    isLoading,
    error,
    refetch: fetchTenants,
    createTenant,
    updateTenant: update,
    deleteTenant: deleteItem,
    assignToRoom: assign,
    removeFromRoom: remove,
  };
}
