// src/app/(dashboard)/settings/organization/page.tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/store/auth.store"
import { 
  Building, 
  Save, 
  Users, 
  MessageSquare, 
  Zap,
  Calendar,
  Globe,
  MapPin,
  Phone,
  Mail,
  Loader2,
  AlertTriangle
} from "lucide-react"
import toast from "react-hot-toast"

const organizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  timezone: z.string().optional(),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

export default function OrganizationSettingsPage() {
  const { user } = useAuthStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDangerZone, setShowDangerZone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: user?.tenant?.name || '',
      description: '',
      website: '',
      phone: '',
      address: '',
      city: '',
      country: 'PE',
      industry: '',
      size: '',
      timezone: 'America/Lima',
    },
  })

  const onSubmit = async (data: OrganizationFormData) => {
    setIsUpdating(true)
    try {
      // Aquí iría la llamada a la API para actualizar la organización
      // await updateOrganization(data)
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Organización actualizada correctamente')
    } catch (error) {
      toast.error('Error al actualizar la organización')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteOrganization = async () => {
    if (!confirm('¿Estás seguro? Esta acción eliminará permanentemente toda la organización y no se puede deshacer.')) {
      return
    }

    try {
      // Aquí iría la llamada a la API para eliminar la organización
      toast.success('Organización eliminada correctamente')
    } catch (error) {
      toast.error('Error al eliminar la organización')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Organización</h1>
        <p className="text-gray-400 mt-1">
          Administra la información y configuración de tu organización
        </p>
      </div>

      {/* Plan & Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Plan Actual
            </CardTitle>
            <Badge variant="connected" className="bg-purple-500/20 text-purple-400">
              {user?.tenant?.plan?.toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {user?.tenant?.plan === 'pro' ? '$49' : user?.tenant?.plan === 'enterprise' ? '$149' : '$19'}
            </div>
            <p className="text-xs text-gray-500">
              por mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Usuarios
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">3</div>
            <p className="text-xs text-gray-500">
              de 20 máximo
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Instancias
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">2</div>
            <p className="text-xs text-gray-500">
              de 5 máximo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Information */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Información de la Organización</CardTitle>
          <CardDescription>
            Actualiza los detalles de tu empresa u organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la organización *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  className="bg-gray-800 border-gray-700"
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industria</Label>
                <select
                  id="industry"
                  {...register("industry")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Selecciona una industria</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="restaurant">Restaurante</option>
                  <option value="services">Servicios</option>
                  <option value="health">Salud</option>
                  <option value="education">Educación</option>
                  <option value="technology">Tecnología</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Tamaño de la empresa</Label>
                <select
                  id="size"
                  {...register("size")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Selecciona el tamaño</option>
                  <option value="1-10">1-10 empleados</option>
                  <option value="11-50">11-50 empleados</option>
                  <option value="51-200">51-200 empleados</option>
                  <option value="201-500">201-500 empleados</option>
                  <option value="500+">500+ empleados</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Zona horaria</Label>
                <select
                  id="timezone"
                  {...register("timezone")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="America/Lima">Lima (UTC-5)</option>
                  <option value="America/New_York">New York (UTC-5)</option>
                  <option value="Europe/Madrid">Madrid (UTC+1)</option>
                  <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                {...register("description")}
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                placeholder="Describe tu empresa o actividad..."
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Sitio web</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="website"
                    type="url"
                    {...register("website")}
                    placeholder="https://tuempresa.com"
                    className="pl-10 bg-gray-800 border-gray-700"
                  />
                </div>
                {errors.website && (
                  <p className="text-xs text-red-400">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="+51 999 123 456"
                    className="pl-10 bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="address"
                    {...register("address")}
                    placeholder="Av. Javier Prado 123"
                    className="pl-10 bg-gray-800 border-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Lima"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="gradient"
                disabled={!isDirty || isUpdating}
              >
                {isUpdating ? (
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

      {/* Danger Zone */}
      <Card className="bg-red-900/10 border-red-800">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Zona de Peligro
          </CardTitle>
          <CardDescription>
            Acciones irreversibles que afectarán permanentemente tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-800 rounded-lg">
              <div>
                <h4 className="font-medium text-red-400 mb-1">Eliminar Organización</h4>
                <p className="text-sm text-gray-400">
                  Esta acción eliminará permanentemente tu organización, todos los datos, 
                  usuarios e instancias de WhatsApp. Esta acción no se puede deshacer.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDangerZone(!showDangerZone)}
              >
                Eliminar
              </Button>
            </div>

            {showDangerZone && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-sm text-red-400 mb-4">
                  Para confirmar, escribe <strong>ELIMINAR</strong> en el campo de abajo:
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="ELIMINAR"
                    className="bg-gray-800 border-red-700"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDeleteOrganization}
                  >
                    Confirmar eliminación
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}