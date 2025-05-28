// src/app/(dashboard)/settings/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir automáticamente a la página de perfil
    router.replace('/settings/profile')
  }, [router])

  return null
}