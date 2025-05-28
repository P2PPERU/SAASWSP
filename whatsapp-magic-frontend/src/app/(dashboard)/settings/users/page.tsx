// src/app/(dashboard)/settings/users/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Users, 
  UserPlus, 
  Mail, 
  MoreVertical,
  Shield,
  Trash2,
  Edit,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Crown,
  Eye,
  Settings,
  Loader2,
  AlertTriangle,
  Copy
} from "lucide-react"
import { useAuthStore } from "@/store/auth.store"
import { tenantService, type TenantUser, type InviteUserRequest } from "@/services/tenant.service"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/utils/cn"
import toast from "react-hot-toast"

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(['admin', 'user', 'viewer']),
  sendEmail: z.boolean(),
})

type InviteFormData = z.infer<typeof inviteSchema>

const editUserSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    role: z.enum(['admin', 'user', 'viewer']),
    status: z.enum(['active', 'inactive', 'pending']),
})

type EditUserFormData = z.infer<typeof editUserSchema>

const roleLabels = {
  admin: { label: 'Administrador', color: 'bg-red-500/20 text-red-400', icon: Crown },
  user: { label: 'Usuario', color: 'bg-blue-500/20 text-blue-400', icon: Shield },
  viewer: { label: 'Visualizador', color: 'bg-gray-500/20 text-gray-400', icon: Eye },
}

const statusLabels = {
  active: { label: 'Activo', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  inactive: { label: 'Inactivo', color: 'bg-gray-500/20 text-gray-400', icon: XCircle },
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  suspended: { label: 'Suspendido', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
}

export default function UsersSettingsPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    formState: { errors: inviteErrors },
    reset: resetInviteForm,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'user',
      sendEmail: true,
    },
  })

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEditForm,
    setValue: setEditValue,
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  })

  // Cargar usuarios
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const usersData = await tenantService.getUsers()
      setUsers(usersData)
    } catch (error) {
      toast.error('Error al cargar usuarios')
    } finally {
      setIsLoading(false)
    }
  }

  // Invitar usuario
  const onInviteSubmit = async (data: InviteFormData) => {
    setIsInviting(true)
    try {
      const result = await tenantService.inviteUser(data)
      
      setUsers(prev => [result.user, ...prev])
      setShowInviteDialog(false)
      resetInviteForm()
      
      if (data.sendEmail) {
        toast.success(`Invitación enviada a ${data.email}`)
      } else {
        toast.success('Usuario invitado correctamente')
        // Mostrar token de invitación si no se envió email
        if (result.inviteToken) {
          navigator.clipboard.writeText(result.inviteToken)
          toast.success('Token de invitación copiado al portapapeles')
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al invitar usuario')
    } finally {
      setIsInviting(false)
    }
  }

  // Editar usuario
  const handleEditUser = (user: TenantUser) => {
    setSelectedUser(user)
    setEditValue('name', user.name)
    setEditValue('role', user.role)
    setEditValue('status', user.status)
    setShowEditDialog(true)
  }

  const onEditSubmit = async (data: EditUserFormData) => {
    if (!selectedUser) return

    setIsUpdating(true)
    try {
      const updatedUser = await tenantService.updateUser(selectedUser.id, data)
      
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u))
      setShowEditDialog(false)
      setSelectedUser(null)
      resetEditForm()
      
      toast.success('Usuario actualizado correctamente')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar usuario')
    } finally {
      setIsUpdating(false)
    }
  }

  // Eliminar usuario
  const handleRemoveUser = async (user: TenantUser) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes eliminarte a ti mismo')
      return
    }

    if (!confirm(`¿Estás seguro de eliminar a ${user.name}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await tenantService.removeUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      toast.success('Usuario eliminado correctamente')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario')
    }
  }

  // Reenviar invitación
  const handleResendInvite = async (user: TenantUser) => {
    try {
      await tenantService.resendInvite(user.id)
      toast.success(`Invitación reenviada a ${user.email}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al reenviar invitación')
    }
  }

  const canManageUsers = currentUser?.role === 'admin'
  const activeUsers = users.filter(u => u.status === 'active').length
  const pendingUsers = users.filter(u => u.status === 'pending').length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Usuarios</h1>
          <p className="text-gray-400 mt-1">
            Gestiona los usuarios de tu organización
          </p>
        </div>

        {canManageUsers && (
          <Button
            variant="gradient"
            onClick={() => setShowInviteDialog(true)}
            className="group"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar Usuario
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Usuarios
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-gray-500">
              de {currentUser?.tenant && 'limits' in currentUser.tenant && (currentUser.tenant as any).limits?.maxUsers
                ? (currentUser.tenant as any).limits.maxUsers
                : 'ilimitados'} máximo
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Usuarios Activos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{activeUsers}</div>
            <p className="text-xs text-gray-500">
              {Math.round((activeUsers / users.length) * 100)}% del total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Invitaciones Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{pendingUsers}</div>
            <p className="text-xs text-gray-500">
              Esperando confirmación
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Administradores
            </CardTitle>
            <Crown className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-gray-500">
              Con acceso completo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
          <CardDescription>
            Lista de todos los usuarios con acceso a tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => {
                const RoleIcon = roleLabels[user.role]?.icon
                const StatusIcon = statusLabels[user.status]?.icon
                const isCurrentUser = user.id === currentUser?.id

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{user.name}</h4>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            Tú
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", roleLabels[user.role].color)}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleLabels[user.role].label}
                        </Badge>
                        <Badge className={cn("text-xs", statusLabels[user.status]?.color)}>
                          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                          {statusLabels[user.status]?.label || user.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.lastLoginAt && (
                      <div className="text-right text-xs text-gray-500">
                        <p>Último acceso</p>
                        <p>
                          {formatDistanceToNow(new Date(user.lastLoginAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    )}

                    {canManageUsers && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          
                          {user.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                              <Send className="mr-2 h-4 w-4" />
                              Reenviar invitación
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem
                            onClick={() => handleRemoveUser(user)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )
            })}

            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay usuarios</h3>
                <p className="text-gray-400 mb-6">
                  Invita a tu equipo para empezar a colaborar
                </p>
                {canManageUsers && (
                  <Button
                    variant="gradient"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invitar Primer Usuario
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Roles y Permisos</CardTitle>
          <CardDescription>
            Descripción de los diferentes niveles de acceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-red-400" />
                <h4 className="font-medium text-red-400">Administrador</h4>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Acceso completo al sistema</li>
                <li>• Gestión de usuarios e instancias</li>
                <li>• Configuración de organización</li>
                <li>• Facturación y planes</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h4 className="font-medium text-blue-400">Usuario</h4>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Gestión de conversaciones</li>
                <li>• Envío de mensajes</li>
                <li>• Configuración de IA</li>
                <li>• Analytics básicos</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-400" />
                <h4 className="font-medium text-gray-400">Visualizador</h4>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Solo lectura de conversaciones</li>
                <li>• Ver analytics y reportes</li>
                <li>• Sin permisos de envío</li>
                <li>• Sin configuración</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
            <DialogDescription>
              Invita a un nuevo miembro a tu organización
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit(onInviteSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                {...registerInvite("email")}
              />
              {inviteErrors.email && (
                <p className="text-xs text-red-400">{inviteErrors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                {...registerInvite("role")}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="viewer">Visualizador - Solo lectura</option>
                <option value="user">Usuario - Acceso estándar</option>
                <option value="admin">Administrador - Acceso completo</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="sendEmail"
                type="checkbox"
                {...registerInvite("sendEmail")}
                className="rounded"
              />
              <Label htmlFor="sendEmail" className="text-sm">
                Enviar invitación por email
              </Label>
            </div>
          </form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={isInviting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInviteSubmit(onInviteSubmit)}
              disabled={isInviting}
              variant="gradient"
            >
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invitando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información y permisos del usuario
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nombre</Label>
                <Input
                  id="editName"
                  {...registerEdit("name")}
                />
                {editErrors.name && (
                  <p className="text-xs text-red-400">{editErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRole">Rol</Label>
                <select
                  id="editRole"
                  {...registerEdit("role")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editStatus">Estado</Label>
                <select
                    id="editStatus"
                    {...registerEdit("status")}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="pending">Pendiente</option>
                </select>
              </div>
            </form>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setSelectedUser(null)
                resetEditForm()
              }}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditSubmit(onEditSubmit)}
              disabled={isUpdating}
              variant="gradient"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}