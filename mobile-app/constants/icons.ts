import { DeviceType } from '@/types';

// SF Symbols / MaterialIcons name mapping
export const DeviceIcons: Record<DeviceType, { name: string; label: string }> = {
  [DeviceType.LIGHT]: { name: 'lightbulb', label: 'Đèn' },
  [DeviceType.DOOR_LOCK]: { name: 'lock', label: 'Khóa cửa' },
  [DeviceType.BUZZER]: { name: 'notifications', label: 'Còi' },
};
