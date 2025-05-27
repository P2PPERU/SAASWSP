// src/components/whatsapp/InstanceCard.tsx
import { WhatsAppInstance, InstanceStatus } from "@/types/whatsapp.types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "./ConnectionStatus";
import { 
  Phone, 
  QrCode, 
  Settings, 
  Trash2, 
  MessageSquare,
  MoreVertical,
  Plug,
  Unplug
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InstanceCardProps {
  instance: WhatsAppInstance;
  onConnect: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
  onViewChats: () => void;
  isConnecting?: boolean;
}

export function InstanceCard({
  instance,
  onConnect,
  onDisconnect,
  onDelete,
  onViewChats,
  isConnecting = false,
}: InstanceCardProps) {
  const router = useRouter();
  const isConnected = instance.status === InstanceStatus.CONNECTED;
  const canConnect = instance.status === InstanceStatus.DISCONNECTED || instance.status === InstanceStatus.FAILED;

  return (
    <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">{instance.name}</h3>
          {instance.phoneNumber && (
            <p className="text-sm text-gray-400 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {instance.phoneNumber}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <ConnectionStatus status={instance.status} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isConnected ? (
                <>
                  <DropdownMenuItem onClick={onViewChats}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Ver Conversaciones
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDisconnect}>
                    <Unplug className="mr-2 h-4 w-4" />
                    Desconectar
                  </DropdownMenuItem>
                </>
              ) : canConnect ? (
                <DropdownMenuItem onClick={onConnect}>
                  <Plug className="mr-2 h-4 w-4" />
                  Conectar
                </DropdownMenuItem>
              ) : null}
              
              <DropdownMenuItem 
                onClick={() => router.push(`/whatsapp/${instance.id}/settings`)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-400">Mensajes Hoy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-400">Conversaciones</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">0%</p>
            <p className="text-xs text-gray-400">Respuesta IA</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={onViewChats}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Ver Chats
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onDisconnect}
              >
                <Unplug className="h-4 w-4" />
              </Button>
            </>
          ) : canConnect ? (
            <Button
              variant="gradient"
              className="w-full"
              onClick={onConnect}
              disabled={isConnecting}
            >
              <QrCode className="mr-2 h-4 w-4" />
              {isConnecting ? "Generando QR..." : "Conectar con QR"}
            </Button>
          ) : instance.status === InstanceStatus.CONNECTING ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/whatsapp/${instance.id}`)}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Ver Código QR
            </Button>
          ) : null}
        </div>

        {/* Last connection */}
        {instance.lastConnectionAt && (
          <p className="text-xs text-gray-500 text-center">
            Última conexión:{" "}
            {formatDistanceToNow(new Date(instance.lastConnectionAt), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}