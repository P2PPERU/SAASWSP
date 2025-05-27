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
      const errorMessage = error.response?.data?.message || 'Error al conectar instancia';
      set({ error: errorMessage, isConnecting: false });
      toast.error(errorMessage);
    }
  },

  checkConnectionStatus: async (instanceId) => {
    try {
      const response = await whatsappService.getConnectionStatus(instanceId);
      const status = response.data;
      
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