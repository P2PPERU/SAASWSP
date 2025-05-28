// src/app/(dashboard)/settings/profile/page.tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth.store"
import { User, Mail, Save, Camera, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/utils/cn"
import toast from "react-hot-toast"

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string()
    .min(6, "Mínimo 6 caracteres")
    .regex(/[A-Z]/, "Debe contener una mayúscula")
    .regex(/[0-9]/, "Debe contener un número"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfileSettingsPage() {
  const { user } = useAuthStore()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      timezone: 'America/Lima',
      language: 'es',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true)
    try {
      // Aquí iría la llamada a la API para actualizar el perfil
      // await updateProfile(data)
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Perfil actualizado correctamente')
    } catch (error) {
      toast.error('Error al actualizar el perfil')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true)
    try {
      // Aquí iría la llamada a la API para cambiar contraseña
      // await changePassword(data)
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Contraseña actualizada correctamente')
      resetPasswordForm()
    } catch (error) {
      toast.error('Error al actualizar la contraseña')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatar(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Perfil</h1>
        <p className="text-gray-400 mt-1">
          Administra tu información personal y preferencias de cuenta
        </p>
      </div>

      {/* Avatar Section */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
          <CardDescription>
            Esta imagen aparecerá en tu perfil y en las notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>
              
              {/* Upload Button */}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1">
              <h3 className="font-medium text-white mb-2">Cambiar foto</h3>
              <p className="text-sm text-gray-400 mb-4">
                JPG, PNG or GIF. Máximo 1MB.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Camera className="w-4 h-4 mr-2" />
                  Cambiar foto
                </Button>
                {avatar && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setAvatar(null)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Actualiza tu información personal y de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  {...registerProfile("name")}
                  className="bg-gray-800 border-gray-700"
                />
                {profileErrors.name && (
                  <p className="text-xs text-red-400">{profileErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    {...registerProfile("email")}
                    className="pl-10 bg-gray-800 border-gray-700"
                  />
                </div>
                {profileErrors.email && (
                  <p className="text-xs text-red-400">{profileErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  {...registerProfile("phone")}
                  placeholder="+51 999 123 456"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Zona horaria</Label>
                <select
                  id="timezone"
                  {...registerProfile("timezone")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="America/Lima">Lima (UTC-5)</option>
                  <option value="America/New_York">New York (UTC-5)</option>
                  <option value="Europe/Madrid">Madrid (UTC+1)</option>
                  <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <select
                  id="language"
                  {...registerProfile("language")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="gradient"
                disabled={!isProfileDirty || isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>
            Actualiza tu contraseña para mantener tu cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input
                id="currentPassword"
                type="password"
                {...registerPassword("currentPassword")}
                className="bg-gray-800 border-gray-700"
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-red-400">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerPassword("newPassword")}
                  className="bg-gray-800 border-gray-700"
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-red-400">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...registerPassword("confirmPassword")}
                  className="bg-gray-800 border-gray-700"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-red-400">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2">Requisitos de contraseña:</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Mínimo 6 caracteres</li>
                <li>• Al menos una letra mayúscula</li>
                <li>• Al menos un número</li>
              </ul>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="outline"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Cambiar contraseña"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">ID de Usuario</p>
              <p className="text-white font-mono">{user?.id}</p>
            </div>
            <div>
              <p className="text-gray-400">Rol</p>
              <p className="text-white capitalize">{user?.role}</p>
            </div>
            <div>
              <p className="text-gray-400">Organización</p>
              <p className="text-white">{user?.tenant?.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Plan</p>
              <p className="text-white capitalize">{user?.tenant?.plan}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}