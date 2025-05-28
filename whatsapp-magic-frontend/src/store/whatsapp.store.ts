// src/store/whatsapp.store.ts
import { create } from 'zustand';
import { whatsappService } from '@/services/whatsapp.service';
import {
  WhatsAppInstance,
  Conversation,
  Message,
  CreateInstanceDto,
  SendMessageDto,
  ConnectionStatusResponse,
} from '@/types/whatsapp.types';
import toast from 'react-hot-toast';

interface WhatsAppState {
  // Estado
  instances: WhatsAppInstance[];
  selectedInstance: WhatsAppInstance | null;
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  connectionStatus: ConnectionStatusResponse | null;
  isLoading: boolean;
  isConnecting: boolean;
  isSendingMessage: boolean;
  error: string | null;

  // Actions - Instances
  fetchInstances: () => Promise<void>;
  createInstance: (data: CreateInstanceDto) => Promise<WhatsAppInstance>;
  selectInstance: (instance: WhatsAppInstance | null) => void;
  updateInstance: (instanceId: string, data: Partial<WhatsAppInstance>) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;

  // Actions - Connection
  connectInstance: (instanceId: string) => Promise<void>;
  checkConnectionStatus: (instanceId: string) => Promise<ConnectionStatusResponse>;
  disconnectInstance: (instanceId: string) => Promise<void>;

  // Actions - Conversations & Messages
  fetchConversations: (instanceId: string) => Promise<void>;
  selectConversation: (conversation: Conversation | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (instanceId: string, data: SendMessageDto) => Promise<void>;
  addNewMessage: (message: Message) => void;

  // Actions - Utils
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  instances: [],
  selectedInstance: null,
  conversations: [],
  selectedConversation: null,
  messages: [],
  connectionStatus: null,
  isLoading: false,
  isConnecting: false,
  isSendingMessage: false,
  error: null,
};

export const useWhatsAppStore = create<WhatsAppState>((set, get) => ({
  ...initialState,

  // ========== INSTANCES ==========

  fetchInstances: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await whatsappService.getInstances();
      set({ instances: response.data, isLoading: false });
      
      // Verificar instancias sin API Key
      const instancesWithoutApiKey = response.data.filter((inst: WhatsAppInstance) => !inst.apiKey);
      if (instancesWithoutApiKey.length > 0) {
        // Usar toast normal con icono de advertencia personalizado
        toast(`⚠️ ${instancesWithoutApiKey.length} instancia(s) sin API Key configurada`, {
          duration: 4000,
          style: {
            background: '#713200',
            color: '#fff',
          },
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar instancias';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  createInstance: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await whatsappService.createInstance(data);
      const newInstance = response.data;
      
      set((state) => ({
        instances: [...state.instances, newInstance],
        isLoading: false,
      }));
      
      toast.success('Instancia creada exitosamente');
      
      // Notificar sobre la API Key generada
      if (newInstance.apiKey) {
        toast.success(`API Key generada: ${newInstance.apiKey.substring(0, 10)}...`, {
          duration: 5000,
        });
      }
      
      return newInstance;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear instancia';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  selectInstance: (instance) => {
    set({ selectedInstance: instance });
    
    // Advertir si la instancia no tiene API Key
    if (instance && !instance.apiKey) {
      // Usar toast normal con icono de advertencia personalizado
      toast('⚠️ Esta instancia no tiene API Key configurada', {
        duration: 3000,
        style: {
          background: '#713200',
          color: '#fff',
        },
      });
    }
  },

  updateInstance: async (instanceId, data) => {
    try {
      const response = await whatsappService.updateInstance(instanceId, data);
      
      set((state) => ({
        instances: state.instances.map((inst) =>
          inst.id === instanceId ? { ...inst, ...data } : inst
        ),
        selectedInstance:
          state.selectedInstance?.id === instanceId
            ? { ...state.selectedInstance, ...data }
            : state.selectedInstance,
      }));
      
      toast.success('Instancia actualizada');
    } catch (error: any) {
      toast.error('Error al actualizar instancia');
    }
  },

  deleteInstance: async (instanceId) => {
    try {
      await whatsappService.deleteInstance(instanceId);
      
      set((state) => ({
        instances: state.instances.filter((inst) => inst.id !== instanceId),
        selectedInstance:
          state.selectedInstance?.id === instanceId ? null : state.selectedInstance,
      }));
      
      toast.success('Instancia eliminada');
    } catch (error: any) {
      toast.error('Error al eliminar instancia');
    }
  },

  // ========== CONNECTION ==========

  connectInstance: async (instanceId) => {
    set({ isConnecting: true, error: null });
    try {
      // Verificar que la instancia tenga API Key
      const instance = get().instances.find(inst => inst.id === instanceId);
      if (!instance?.apiKey) {
        throw new Error('La instancia no tiene API Key configurada');
      }
      
      const response = await whatsappService.connectInstance(instanceId);
      
      // Actualizar instancia con QR code
      set((state) => ({
        instances: state.instances.map((inst) =>
          inst.id === instanceId
            ? { ...inst, qrCode: response.data.qrCode, status: response.data.instance.status }
            : inst
        ),
        selectedInstance:
          state.selectedInstance?.id === instanceId
            ? { ...state.selectedInstance, qrCode: response.data.qrCode, status: response.data.instance.status }
            : state.selectedInstance,
        isConnecting: false,
      }));

      if (response.data.connected) {
        toast.success('WhatsApp conectado exitosamente');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al conectar instancia';
      set({ error: errorMessage, isConnecting: false });
      toast.error(errorMessage);
    }
  },

  checkConnectionStatus: async (instanceId) => {
    try {
      const response = await whatsappService.getConnectionStatus(instanceId);
      const status = response.data;
      
      // Verificar si tiene API Key
      const instance = get().instances.find(i => i.id === instanceId);
      status.hasApiKey = !!instance?.apiKey;
      
      // Actualizar estado de la instancia
      set((state) => ({
        connectionStatus: status,
        instances: state.instances.map((inst) =>
          inst.id === instanceId
            ? {
                ...inst,
                status: status.status,
                qrCode: status.qrCode || inst.qrCode,
                phoneNumber: status.phoneNumber || inst.phoneNumber,
              }
            : inst
        ),
        selectedInstance:
          state.selectedInstance?.id === instanceId
            ? {
                ...state.selectedInstance,
                status: status.status,
                qrCode: status.qrCode || state.selectedInstance.qrCode,
                phoneNumber: status.phoneNumber || state.selectedInstance.phoneNumber,
              }
            : state.selectedInstance,
      }));

      return status;
    } catch (error: any) {
      console.error('Error checking connection status:', error);
      throw error;
    }
  },

  disconnectInstance: async (instanceId) => {
    try {
      await whatsappService.disconnectInstance(instanceId);
      
      set((state) => ({
        instances: state.instances.map((inst) =>
          inst.id === instanceId
            ? { ...inst, status: 'disconnected' as any, qrCode: undefined }
            : inst
        ),
        selectedInstance:
          state.selectedInstance?.id === instanceId
            ? { ...state.selectedInstance, status: 'disconnected' as any, qrCode: undefined }
            : state.selectedInstance,
      }));
      
      toast.success('WhatsApp desconectado');
    } catch (error: any) {
      toast.error('Error al desconectar');
    }
  },

  // ========== CONVERSATIONS & MESSAGES ==========

  fetchConversations: async (instanceId) => {
    set({ isLoading: true });
    try {
      const response = await whatsappService.getConversations(instanceId);
      set({ conversations: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error('Error al cargar conversaciones');
    }
  },

  selectConversation: (conversation) => {
    set({ selectedConversation: conversation, messages: [] });
  },

  fetchMessages: async (conversationId) => {
    set({ isLoading: true });
    try {
      const response = await whatsappService.getMessages(conversationId);
      set({ messages: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error('Error al cargar mensajes');
    }
  },

  sendMessage: async (instanceId, data) => {
    set({ isSendingMessage: true });
    try {
      const response = await whatsappService.sendMessage(instanceId, data);
      const newMessage = response.data.message;
      
      // Agregar mensaje a la lista
      set((state) => ({
        messages: [...state.messages, newMessage],
        isSendingMessage: false,
      }));
      
      // Actualizar última actividad de la conversación
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === newMessage.conversationId
            ? { ...conv, lastMessageAt: new Date().toISOString() }
            : conv
        ),
      }));
      
      toast.success('Mensaje enviado');
    } catch (error: any) {
      set({ isSendingMessage: false });
      const errorMessage = error.response?.data?.message || 'Error al enviar mensaje';
      toast.error(errorMessage);
    }
  },

  addNewMessage: (message) => {
    set((state) => {
      // Solo agregar si el mensaje pertenece a la conversación seleccionada
      if (state.selectedConversation?.id === message.conversationId) {
        return { messages: [...state.messages, message] };
      }
      return state;
    });
  },

  // ========== UTILS ==========

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));