import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSystemConfig() {
  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => base44.entities.SystemConfig.list(),
    refetchInterval: 5000,
  });

  const getConfig = (key, defaultVal = '') => {
    const cfg = configs.find(c => c.key === key);
    return cfg ? cfg.value : defaultVal;
  };

  return { configs, getConfig };
}