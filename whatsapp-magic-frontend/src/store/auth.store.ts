// src/store/auth.store.ts
import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import { User, LoginDto, RegisterDto } from '@/types/auth.types';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await authService.login(data);
      
      // Obtener perfil del usuario después del login
      const profileResponse = await authService.getProfile();
      
      set({ 
        user: profileResponse.data, 
        isAuthenticated: true,
        isLoading: false 
      });

      toast.success('¡Bienvenido de vuelta! 🎉');
      
      // Redirigir se manejará en el componente
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión';
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      toast.error(errorMessage);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register(data);
      
      // Obtener perfil del usuario después del registro
      const profileResponse = await authService.getProfile();
      
      set({ 
        user: profileResponse.data, 
        isAuthenticated: true,
        isLoading: false 
      });

      toast.success('¡Cuenta creada exitosamente! 🚀');
      
      // Redirigir se manejará en el componente
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear la cuenta';
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      toast.error(errorMessage);
    }
  },

  logout: () => {
    authService.logout();
    set({ 
      user: null, 
      isAuthenticated: false,
      error: null 
    });
    toast.success('Sesión cerrada correctamente');
    
    // Redirigir a login
    window.location.href = '/login';
  },

  checkAuth: async () => {
    // Verificar si hay token almacenado
    if (!authService.isAuthenticated()) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const profileResponse = await authService.getProfile();
      set({ 
        user: profileResponse.data, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      // Token inválido o expirado
      authService.logout();
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));