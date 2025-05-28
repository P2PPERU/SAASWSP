// src/app/(dashboard)/settings/layout.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/utils/cn"
import { 
  User, 
  Building, 
  Users, 
  Bell, 
  Plug, 
  CreditCard, 
  Shield,
  Palette,
  Globe,
  Key
} from "lucide-react"

const settingsNavigation = [
  {
    name: 'Perfil',
    href: '/settings/profile',
    icon: User,
    description: 'Información personal y preferencias'
  },
  {
    name: 'Organización',
    href: '/settings/organization',
    icon: Building,
    description: 'Configuración de la empresa'
  },
  {
    name: 'Usuarios',
    href: '/settings/users',
    icon: Users,
    description: 'Gestión de usuarios del equipo'
  },
  {
    name: 'Notificaciones',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Preferencias de notificaciones'
  },
  {
    name: 'Integraciones',
    href: '/settings/integrations',
    icon: Plug,
    description: 'Webhooks y API keys'
  },
  {
    name: 'Seguridad',
    href: '/settings/security',
    icon: Shield,
    description: 'Configuración de seguridad'
  },
  {
    name: 'Apariencia',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Tema y personalización'
  },
  {
    name: 'Facturación',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Plan y facturación'
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Configuración</h1>
          <p className="text-gray-400 text-sm">
            Administra tu cuenta y preferencias
          </p>
        </div>

        <nav className="space-y-2">
          {settingsNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 rounded-lg transition-colors text-sm",
                  isActive
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <item.icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Plan Info */}
        <div className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm font-medium text-white">Plan Pro</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            2 de 5 instancias usadas
          </p>
          <Link
            href="/settings/billing"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Ver detalles del plan →
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}