// src/app/(dashboard)/campaigns/page.tsx
"use client"

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Trash2, 
  BarChart3,
  Users,
  MessageSquare,
  Calendar,
  Clock,
  Target,
  Zap,
  Copy,
  Edit,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";

// Types
interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  type: 'broadcast' | 'drip' | 'promotional' | 'reminder';
  message: string;
  targetAudience: {
    total: number;
    segments: string[];
  };
  schedule: {
    startDate: string;
    endDate?: string;
    timezone: string;
  };
  results: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Promoción Black Friday',
    description: 'Descuentos especiales para el Black Friday',
    status: 'completed',
    type: 'promotional',
    message: '🔥 BLACK FRIDAY: 50% OFF en toda la tienda! Solo hoy. No te lo pierdas!',
    targetAudience: {
      total: 1250,
      segments: ['clientes-vip', 'compradores-frecuentes']
    },
    schedule: {
      startDate: '2025-05-20T09:00:00Z',
      endDate: '2025-05-20T18:00:00Z',
      timezone: 'America/Lima'
    },
    results: {
      sent: 1250,
      delivered: 1198,
      read: 956,
      replied: 127,
      failed: 52
    },
    createdAt: '2025-05-19T10:00:00Z',
    updatedAt: '2025-05-20T18:30:00Z'
  },
  {
    id: '2',
    name: 'Recordatorio de Cita',
    description: 'Recordatorios automáticos 24h antes',
    status: 'running',
    type: 'reminder',
    message: '📅 Recordatorio: Tienes una cita mañana a las {hora}. ¿Confirmas tu asistencia?',
    targetAudience: {
      total: 45,
      segments: ['citas-programadas']
    },
    schedule: {
      startDate: '2025-05-25T00:00:00Z',
      timezone: 'America/Lima'
    },
    results: {
      sent: 28,
      delivered: 27,
      read: 23,
      replied: 19,
      failed: 1
    },
    createdAt: '2025-05-24T15:00:00Z',
    updatedAt: '2025-05-26T12:00:00Z'
  }
];

const campaignSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  type: z.enum(['broadcast', 'drip', 'promotional', 'reminder']),
  message: z.string().min(1, "El mensaje es requerido").max(4096, "Máximo 4096 caracteres"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().optional(),
  timezone: z.string(),
  segments: z.array(z.string()).min(1, "Selecciona al menos un segmento"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const campaignTypes = [
  { id: 'broadcast', name: 'Difusión', description: 'Mensaje único a toda la audiencia', icon: '📢' },
  { id: 'drip', name: 'Goteo', description: 'Serie de mensajes programados', icon: '💧' },
  { id: 'promotional', name: 'Promocional', description: 'Ofertas y promociones', icon: '🎯' },
  { id: 'reminder', name: 'Recordatorio', description: 'Recordatorios automáticos', icon: '⏰' },
];

const audienceSegments = [
  { id: 'all', name: 'Todos los contactos', count: 2847 },
  { id: 'clientes-vip', name: 'Clientes VIP', count: 156 },
  { id: 'compradores-frecuentes', name: 'Compradores Frecuentes', count: 423 },
  { id: 'nuevos-leads', name: 'Nuevos Leads', count: 789 },
  { id: 'inactivos', name: 'Inactivos (30 días)', count: 234 },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      timezone: 'America/Lima',
      segments: [],
    },
  });

  const watchedSegments = watch('segments') || [];
  const watchedMessage = watch('message') || '';

  const getStatusColor = (status: Campaign['status']) => {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-400',
      scheduled: 'bg-blue-500/20 text-blue-400',
      running: 'bg-green-500/20 text-green-400',
      paused: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-purple-500/20 text-purple-400',
      failed: 'bg-red-500/20 text-red-400',
    };
    return colors[status];
  };

  const getStatusIcon = (status: Campaign['status']) => {
    switch (status) {
      case 'running': return <Play className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'failed': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onSubmit = async (data: CampaignFormData) => {
    setIsCreating(true);
    try {
      // Simular creación de campaña
      const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description || '',
        status: 'draft',
        type: data.type,
        message: data.message,
        targetAudience: {
          total: data.segments.reduce((total, segmentId) => {
            const segment = audienceSegments.find(s => s.id === segmentId);
            return total + (segment?.count || 0);
          }, 0),
          segments: data.segments,
        },
        schedule: {
          startDate: data.startDate,
          endDate: data.endDate,
          timezone: data.timezone,
        },
        results: {
          sent: 0,
          delivered: 0,
          read: 0,
          replied: 0,
          failed: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCampaigns(prev => [newCampaign, ...prev]);
      setShowCreateDialog(false);
      reset();
      toast.success('Campaña creada exitosamente');
    } catch (error) {
      toast.error('Error al crear la campaña');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'stop' | 'duplicate' | 'delete') => {
    try {
      switch (action) {
        case 'start':
          setCampaigns(prev => prev.map(c => 
            c.id === campaignId ? { ...c, status: 'running' as const } : c
          ));
          toast.success('Campaña iniciada');
          break;
        case 'pause':
          setCampaigns(prev => prev.map(c => 
            c.id === campaignId ? { ...c, status: 'paused' as const } : c
          ));
          toast.success('Campaña pausada');
          break;
        case 'stop':
          setCampaigns(prev => prev.map(c => 
            c.id === campaignId ? { ...c, status: 'completed' as const } : c
          ));
          toast.success('Campaña detenida');
          break;
        case 'duplicate':
          const original = campaigns.find(c => c.id === campaignId);
          if (original) {
            const duplicate: Campaign = {
              ...original,
              id: Date.now().toString(),
              name: `${original.name} (Copia)`,
              status: 'draft',
              results: { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setCampaigns(prev => [duplicate, ...prev]);
          }
          toast.success('Campaña duplicada');
          break;
        case 'delete':
          if (confirm('¿Estás seguro de eliminar esta campaña?')) {
            setCampaigns(prev => prev.filter(c => c.id !== campaignId));
            toast.success('Campaña eliminada');
          }
          break;
      }
    } catch (error) {
      toast.error('Error al procesar la acción');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-purple-500" />
            Campañas
          </h1>
          <p className="text-gray-400 mt-1">
            Crea y gestiona campañas de marketing masivo
          </p>
        </div>

        <Button
          variant="gradient"
          onClick={() => setShowCreateDialog(true)}
          className="group"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Campaña
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Campañas
            </CardTitle>
            <Zap className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-gray-500">
              {campaigns.filter(c => c.status === 'running').length} activas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Mensajes Enviados
            </CardTitle>
            <Send className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((total, c) => total + c.results.sent, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Tasa de Entrega
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {campaigns.length > 0 ? 
                Math.round((campaigns.reduce((total, c) => total + c.results.delivered, 0) / 
                           campaigns.reduce((total, c) => total + c.results.sent, 0)) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-500">
              Promedio general
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Respuestas
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((total, c) => total + c.results.replied, 0)}
            </div>
            <p className="text-xs text-gray-500">
              Total recibidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar campañas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="scheduled">Programadas</option>
          <option value="running">En ejecución</option>
          <option value="paused">Pausadas</option>
          <option value="completed">Completadas</option>
          <option value="failed">Fallidas</option>
        </select>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <Badge className={cn("text-xs", getStatusColor(campaign.status))}>
                      {getStatusIcon(campaign.status)}
                      <span className="ml-1 capitalize">{campaign.status}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {campaignTypes.find(t => t.id === campaign.type)?.icon} {campaignTypes.find(t => t.id === campaign.type)?.name}
                    </Badge>
                  </div>

                  {campaign.description && (
                    <p className="text-gray-400 text-sm mb-3">{campaign.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Audiencia</p>
                      <p className="text-white font-medium">{campaign.targetAudience.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Enviados</p>
                      <p className="text-white font-medium">{campaign.results.sent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Entregados</p>
                      <p className="text-green-400 font-medium">{campaign.results.delivered.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Leídos</p>
                      <p className="text-blue-400 font-medium">{campaign.results.read.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Respuestas</p>
                      <p className="text-purple-400 font-medium">{campaign.results.replied}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Creada {format(new Date(campaign.createdAt), "dd 'de' MMM, yyyy", { locale: es })}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedCampaign(campaign)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'duplicate')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {campaign.status === 'draft' && (
                      <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'start')}>
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar
                      </DropdownMenuItem>
                    )}
                    {campaign.status === 'running' && (
                      <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'pause')}>
                        <Pause className="mr-2 h-4 w-4" />
                        Pausar
                      </DropdownMenuItem>
                    )}
                    {campaign.status === 'paused' && (
                      <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'start')}>
                        <Play className="mr-2 h-4 w-4" />
                        Reanudar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleCampaignAction(campaign.id, 'delete')}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCampaigns.length === 0 && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-12 text-center">
              <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay campañas</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || statusFilter !== 'all' 
                  ? "No se encontraron campañas con los filtros actuales"
                  : "Crea tu primera campaña para empezar"
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button
                  variant="gradient"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Campaña
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Campaña</DialogTitle>
            <DialogDescription>
              Crea una nueva campaña de marketing para WhatsApp
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la campaña</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Ej: Promoción Black Friday"
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de campaña</Label>
                <select
                  id="type"
                  {...register("type")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  {campaignTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="Breve descripción de la campaña"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <textarea
                id="message"
                {...register("message")}
                className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none"
                placeholder="Escribe el mensaje de tu campaña..."
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>{watchedMessage.length} / 4096 caracteres</span>
                {errors.message && (
                  <span className="text-red-400">{errors.message.message}</span>
                )}
              </div>
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <Label>Audiencia</Label>
              <div className="space-y-2">
                {audienceSegments.map((segment) => (
                  <label key={segment.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      value={segment.id}
                      {...register("segments")}
                      className="rounded"
                    />
                    <span className="flex-1">{segment.name}</span>
                    <span className="text-sm text-gray-400">{segment.count.toLocaleString()}</span>
                  </label>
                ))}
              </div>
              {errors.segments && (
                <p className="text-xs text-red-400">{errors.segments.message}</p>
              )}
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-xs text-red-400">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de fin (opcional)</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...register("endDate")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Zona horaria</Label>
              <select
                id="timezone"
                {...register("timezone")}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="America/Lima">Lima (UTC-5)</option>
                <option value="America/New_York">New York (UTC-5)</option>
                <option value="Europe/Madrid">Madrid (UTC+1)</option>
              </select>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isCreating}
              variant="gradient"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Campaña
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}