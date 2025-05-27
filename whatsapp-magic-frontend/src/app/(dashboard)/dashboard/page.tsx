// src/app/(dashboard)/dashboard/page.tsx
"use client"

import { useAuthStore } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, MessageSquare, Users, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          ¡Hola {user?.name}! 👋
        </h1>
        <p className="text-gray-400">
          Bienvenido a tu dashboard de WhatsApp Magic
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Mensajes Hoy
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              +0% desde ayer
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Conversaciones Activas
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              +0% desde ayer
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Respuestas IA
            </CardTitle>
            <Sparkles className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              IA desactivada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Tasa de Conversión
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-gray-500">
              Sin datos aún
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Card */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-xl">
            🚀 Configura tu WhatsApp en 2 minutos
          </CardTitle>
          <CardDescription className="text-gray-300">
            Estás a solo 3 pasos de empezar a vender mientras duermes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="gradient" 
            size="lg"
            onClick={() => router.push('/onboarding')}
          >
            Empezar Configuración
            <Sparkles className="ml-2 w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Tenant Info (Debug) */}
      {user?.tenant && (
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400">
            Organización: <span className="text-white">{user.tenant.name}</span>
          </p>
          <p className="text-sm text-gray-400">
            Plan: <span className="text-white capitalize">{user.tenant.plan}</span>
          </p>
          <p className="text-sm text-gray-400">
            Estado: <span className="text-green-400 capitalize">{user.tenant.status}</span>
          </p>
        </div>
      )}
    </div>
  )
}