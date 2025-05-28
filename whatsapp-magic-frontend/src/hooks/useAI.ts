// src/hooks/useAI.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService, AIConfig, AIStats, TestAIRequest } from '@/services/ai.service';
import { QUERY_KEYS } from '@/utils/constants';
import toast from 'react-hot-toast';

// Hook principal para configuración de IA
export function useAIConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.AI.CONFIG,
    queryFn: () => aiService.getConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<AIConfig>) => aiService.updateConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI.CONFIG });
      toast.success('Configuración de IA actualizada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar configuración');
    },
  });

  const toggleAIMutation = useMutation({
    mutationFn: (enabled: boolean) => aiService.toggleAI(enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI.CONFIG });
      toast.success(`IA ${enabled ? 'activada' : 'desactivada'}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar estado de IA');
    },
  });

  return {
    config,
    isLoading,
    error,
    updateConfig: updateConfigMutation.mutate,
    toggleAI: toggleAIMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
    isToggling: toggleAIMutation.isPending,
  };
}

// Hook para estadísticas de IA
export function useAIStats(period: 'today' | 'week' | 'month' = 'week') {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.AI.STATS, period],
    queryFn: () => aiService.getStats(period),
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

// Hook para testing de IA
export function useAITest() {
  const testMutation = useMutation({
    mutationFn: (data: TestAIRequest) => aiService.testResponse(data),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al probar IA');
    },
  });

  return {
    testAI: testMutation.mutate,
    isTestingAI: testMutation.isPending,
    testResult: testMutation.data,
    testError: testMutation.error,
  };
}

// Hook para plantillas de IA
export function useAITemplates() {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: QUERY_KEYS.AI.TEMPLATES,
    queryFn: () => aiService.getTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (industry: string) => aiService.applyTemplate(industry),
    onSuccess: (_, industry) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI.CONFIG });
      toast.success(`Plantilla "${industry}" aplicada correctamente`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al aplicar plantilla');
    },
  });

  return {
    templates,
    isLoading,
    applyTemplate: applyTemplateMutation.mutate,
    isApplying: applyTemplateMutation.isPending,
  };
}

// Hook para respuestas personalizadas
export function useCustomResponses() {
  const queryClient = useQueryClient();

  const { data: responses, isLoading } = useQuery({
    queryKey: ['ai', 'custom-responses'],
    queryFn: () => aiService.getCustomResponses(),
  });

  const updateResponsesMutation = useMutation({
    mutationFn: (responses: Record<string, string>) => 
      aiService.updateCustomResponses(responses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'custom-responses'] });
      toast.success('Respuestas personalizadas actualizadas');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar respuestas');
    },
  });

  return {
    responses,
    isLoading,
    updateResponses: updateResponsesMutation.mutate,
    isUpdating: updateResponsesMutation.isPending,
  };
}

// Hook para health check de IA
export function useAIHealth() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['ai', 'health'],
    queryFn: () => aiService.checkHealth(),
    refetchInterval: 60000, // Cada minuto
  });

  return {
    health,
    isLoading,
    isHealthy: health?.status === 'ok',
    isConfigured: health?.configured,
  };
}

// Hook para resetear contadores de uso
export function useAIUsageReset() {
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: () => aiService.resetUsage(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI.CONFIG });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI.STATS });
      toast.success('Contadores de uso reseteados');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al resetear contadores');
    },
  });

  return {
    resetUsage: resetMutation.mutate,
    isResetting: resetMutation.isPending,
  };
}

// Hook combinado para toda la funcionalidad de IA
export function useAI(period: 'today' | 'week' | 'month' = 'week') {
  const config = useAIConfig();
  const stats = useAIStats(period);
  const test = useAITest();
  const templates = useAITemplates();
  const customResponses = useCustomResponses();
  const health = useAIHealth();
  const usageReset = useAIUsageReset();

  return {
    // Configuración
    config: config.config,
    isLoadingConfig: config.isLoading,
    updateConfig: config.updateConfig,
    toggleAI: config.toggleAI,
    isUpdatingConfig: config.isUpdating,
    isTogglingAI: config.isToggling,

    // Estadísticas
    stats: stats.stats,
    isLoadingStats: stats.isLoading,
    refetchStats: stats.refetch,

    // Testing
    testAI: test.testAI,
    isTestingAI: test.isTestingAI,
    testResult: test.testResult,

    // Plantillas
    templates: templates.templates,
    isLoadingTemplates: templates.isLoading,
    applyTemplate: templates.applyTemplate,
    isApplyingTemplate: templates.isApplying,

    // Respuestas personalizadas
    customResponses: customResponses.responses,
    updateCustomResponses: customResponses.updateResponses,
    isUpdatingResponses: customResponses.isUpdating,

    // Health
    health: health.health,
    isHealthy: health.isHealthy,
    isConfigured: health.isConfigured,

    // Resetear uso
    resetUsage: usageReset.resetUsage,
    isResettingUsage: usageReset.isResetting,
  };
}