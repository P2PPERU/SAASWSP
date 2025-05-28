// src/hooks/useWhatsApp.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappService } from '@/services/whatsapp.service';
import { useWhatsAppStore } from '@/store/whatsapp.store';
import { 
  WhatsAppInstance, 
  CreateInstanceDto, 
  SendMessageDto,
  BulkMessageDto,
  ScheduleMessageDto 
} from '@/types/whatsapp.types';
import toast from 'react-hot-toast';
import { useCallback, useEffect } from 'react';

// Hook principal para manejar instancias
export function useWhatsAppInstances() {
  const queryClient = useQueryClient();
  
  const { 
    data: instances = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const response = await whatsappService.getInstances();
      return response.data;
    },
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  const createInstanceMutation = useMutation({
    mutationFn: (data: CreateInstanceDto) => whatsappService.createInstance(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success(`Instancia "${response.data.name}" creada exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear instancia');
    },
  });

  const deleteInstanceMutation = useMutation({
    mutationFn: (instanceId: string) => whatsappService.deleteInstance(instanceId),
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instancia eliminada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar instancia');
    },
  });

  return {
    instances,
    isLoading,
    error,
    refetch,
    createInstance: createInstanceMutation.mutate,
    deleteInstance: deleteInstanceMutation.mutate,
    isCreating: createInstanceMutation.isPending,
    isDeleting: deleteInstanceMutation.isPending,
  };
}

// Hook para conexión de instancias
export function useInstanceConnection(instanceId?: string) {
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: () => whatsappService.connectInstance(instanceId!),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status', instanceId] });
      
      if (response.data.connected) {
        toast.success('¡WhatsApp conectado exitosamente!');
      } else {
        toast.success('Código QR generado. Escanea con tu WhatsApp.');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al conectar');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => whatsappService.disconnectInstance(instanceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status', instanceId] });
      toast.success('WhatsApp desconectado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al desconectar');
    },
  });

// Query para estado de conexión en tiempo real
const { data: connectionStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['connection-status', instanceId],
    queryFn: async () => {
        const res = await whatsappService.getConnectionStatus(instanceId!);
        return res.data;
    },
    enabled: !!instanceId,
    refetchInterval: (data: any) => {
        // Tipado seguro
        if (data?.connecting) return 3000;
        if (data?.connected) return 30000;
        return 10000;
    },
});

  return {
    connectionStatus: connectionStatus,
    isCheckingStatus,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}

// Hook para conversaciones
export function useConversations(instanceId?: string) {
  const { 
    conversations, 
    selectedConversation,
    fetchConversations,
    selectConversation,
    isLoading 
  } = useWhatsAppStore();

  useEffect(() => {
    if (instanceId && conversations.length === 0) {
      fetchConversations(instanceId);
    }
  }, [instanceId, conversations.length, fetchConversations]);

  return {
    conversations,
    selectedConversation,
    selectConversation,
    isLoading,
    refetch: () => instanceId && fetchConversations(instanceId),
  };
}

// Hook para mensajes
export function useMessages(conversationId?: string) {
  const { 
    messages, 
    fetchMessages, 
    addNewMessage,
    isLoading 
  } = useWhatsAppStore();

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  return {
    messages,
    addNewMessage,
    isLoading,
    refetch: () => conversationId && fetchMessages(conversationId),
  };
}

// Hook para envío de mensajes
export function useMessageSending(instanceId?: string) {
  const queryClient = useQueryClient();
  const { addNewMessage } = useWhatsAppStore();

  const sendMessageMutation = useMutation({
    mutationFn: (data: SendMessageDto) => whatsappService.sendMessage(instanceId!, data),
    onSuccess: (response) => {
      // Agregar mensaje optimistamente
      addNewMessage(response.data.message);
      toast.success('Mensaje enviado correctamente');
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['conversations', instanceId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al enviar mensaje');
    },
  });

  const sendBulkMutation = useMutation({
    mutationFn: (data: BulkMessageDto) => whatsappService.sendBulkMessages(instanceId!, data),
    onSuccess: (response) => {
      toast.success(`${response.data.totalQueued} mensajes agregados a la cola`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al enviar mensajes masivos');
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: ScheduleMessageDto) => whatsappService.scheduleMessage(instanceId!, data),
    onSuccess: (response) => {
      toast.success(`Mensaje programado para ${new Date(response.data.scheduledFor).toLocaleString()}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al programar mensaje');
    },
  });

  return {
    sendMessage: sendMessageMutation.mutate,
    sendBulkMessages: sendBulkMutation.mutate,
    scheduleMessage: scheduleMutation.mutate,
    isSending: sendMessageMutation.isPending,
    isSendingBulk: sendBulkMutation.isPending,
    isScheduling: scheduleMutation.isPending,
  };
}

// Hook para estadísticas y monitoreo
export function useWhatsAppStats() {
  const { data: queueStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => whatsappService.getQueueStats(),
    refetchInterval: 5000, // Refetch cada 5 segundos
  });

  const { data: rateLimitUsage } = useQuery({
    queryKey: ['rate-limit-usage'],
    queryFn: () => whatsappService.getRateLimitUsage(),
    refetchInterval: 60000, // Refetch cada minuto
  });

  return {
    queueStats: queueStats?.data,
    rateLimitUsage: rateLimitUsage?.data,
  };
}

// Hook para manejo de errores y reconexión automática
export function useWhatsAppErrorHandling() {
  const queryClient = useQueryClient();

  const retryFailedMessages = useMutation({
    mutationFn: () => whatsappService.retryFailedMessages(),
    onSuccess: (response) => {
      toast.success(`${response.data.retriedMessages} mensajes reintentados`);
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
    onError: (error: any) => {
      toast.error('Error al reintentar mensajes');
    },
  });

  const handleConnectionError = useCallback((instanceId: string, error: any) => {
    console.error(`Connection error for instance ${instanceId}:`, error);
    
    // Invalidar queries para forzar refetch
    queryClient.invalidateQueries({ queryKey: ['connection-status', instanceId] });
    queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    
    // Mostrar notificación apropiada
    if (error.response?.status === 401) {
      toast.error('API Key inválida. Revisa la configuración.');
    } else if (error.response?.status === 404) {
      toast.error('Instancia no encontrada en Evolution API.');
    } else {
      toast.error('Error de conexión. Verificando estado...');
    }
  }, [queryClient]);

  return {
    retryFailedMessages: retryFailedMessages.mutate,
    isRetrying: retryFailedMessages.isPending,
    handleConnectionError,
  };
}

// Hook combinado para funcionalidad completa de WhatsApp
export function useWhatsApp(instanceId?: string) {
  const instances = useWhatsAppInstances();
  const connection = useInstanceConnection(instanceId);
  const conversations = useConversations(instanceId);
  const messaging = useMessageSending(instanceId);
  const stats = useWhatsAppStats();
  const errorHandling = useWhatsAppErrorHandling();

  return {
    // Instancias
    instances: instances.instances,
    isLoadingInstances: instances.isLoading,
    createInstance: instances.createInstance,
    deleteInstance: instances.deleteInstance,
    isCreating: instances.isCreating,
    
    // Conexión
    connectionStatus: connection.connectionStatus,
    connect: connection.connect,
    disconnect: connection.disconnect,
    isConnecting: connection.isConnecting,
    
    // Conversaciones
    conversations: conversations.conversations,
    selectedConversation: conversations.selectedConversation,
    selectConversation: conversations.selectConversation,
    
    // Mensajería
    sendMessage: messaging.sendMessage,
    sendBulkMessages: messaging.sendBulkMessages,
    scheduleMessage: messaging.scheduleMessage,
    isSending: messaging.isSending,
    
    // Estadísticas
    queueStats: stats.queueStats,
    rateLimitUsage: stats.rateLimitUsage,
    
    // Manejo de errores
    retryFailedMessages: errorHandling.retryFailedMessages,
    handleConnectionError: errorHandling.handleConnectionError,
  };
}