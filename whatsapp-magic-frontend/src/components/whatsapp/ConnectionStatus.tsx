// src/components/whatsapp/ConnectionStatus.tsx
import { cn } from "@/utils/cn";
import { InstanceStatus } from "@/types/whatsapp.types";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  status: InstanceStatus;
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export function ConnectionStatus({ 
  status, 
  className,
  showIcon = true,
  showText = true 
}: ConnectionStatusProps) {
  const statusConfig = {
    [InstanceStatus.CONNECTED]: {
      label: 'Conectado',
      color: 'bg-green-500/20 text-green-400 border-green-500/20',
      icon: Wifi,
    },
    [InstanceStatus.CONNECTING]: {
      label: 'Conectando...',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
      icon: Loader2,
    },
    [InstanceStatus.DISCONNECTED]: {
      label: 'Desconectado',
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/20',
      icon: WifiOff,
    },
    [InstanceStatus.FAILED]: {
      label: 'Error',
      color: 'bg-red-500/20 text-red-400 border-red-500/20',
      icon: WifiOff,
    },
  };

  const config = statusConfig[status] || statusConfig[InstanceStatus.DISCONNECTED];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.color,
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            "w-3 h-3",
            status === InstanceStatus.CONNECTING && "animate-spin"
          )} 
        />
      )}
      {showText && <span>{config.label}</span>}
    </div>
  );
}