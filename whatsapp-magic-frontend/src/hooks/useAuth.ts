// src/hooks/useAuth.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface UseAuthOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo = '/login', redirectIfFound = false } = options;
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Verificar autenticación al montar el componente
    checkAuth();
  }, []);

  useEffect(() => {
    // No hacer nada mientras se está cargando
    if (isLoading) return;

    // Si no está autenticado y necesita estarlo, redirigir a login
    if (!isAuthenticated && !redirectIfFound) {
      router.push(redirectTo);
    }

    // Si está autenticado y no debería estarlo (ej: página de login), redirigir
    if (isAuthenticated && redirectIfFound) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, redirectIfFound, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
  };
}

// Hook para páginas protegidas
export function useRequireAuth(redirectTo = '/login') {
  return useAuth({ redirectTo, redirectIfFound: false });
}

// Hook para páginas públicas (login, register) que deben redirigir si ya está autenticado
export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  return useAuth({ redirectTo, redirectIfFound: true });
}