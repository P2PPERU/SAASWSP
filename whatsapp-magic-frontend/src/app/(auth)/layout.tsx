// src/app/(auth)/layout.tsx
"use client"

import { useRedirectIfAuthenticated } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading } = useRedirectIfAuthenticated("/dashboard")

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar las páginas de auth
  return <>{children}</>
}