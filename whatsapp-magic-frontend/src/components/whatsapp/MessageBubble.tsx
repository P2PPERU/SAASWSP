// src/components/whatsapp/MessageBubble.tsx
import { Message, MessageDirection, MessageStatus, MessageType } from "@/types/whatsapp.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Image as ImageIcon,
  FileText,
  MapPin,
  Mic,
  Video,
  Bot
} from "lucide-react";
import { cn } from "@/utils/cn";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === MessageDirection.OUTBOUND;

  const getStatusIcon = () => {
    switch (message.status) {
      case MessageStatus.PENDING:
        return <Clock className="w-3 h-3" />;
      case MessageStatus.SENT:
        return <Check className="w-3 h-3" />;
      case MessageStatus.DELIVERED:
        return <CheckCheck className="w-3 h-3" />;
      case MessageStatus.READ:
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case MessageStatus.FAILED:
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (message.type) {
      case MessageType.IMAGE:
        return <ImageIcon className="w-4 h-4 mr-1" />;
      case MessageType.AUDIO:
        return <Mic className="w-4 h-4 mr-1" />;
      case MessageType.VIDEO:
        return <Video className="w-4 h-4 mr-1" />;
      case MessageType.DOCUMENT:
        return <FileText className="w-4 h-4 mr-1" />;
      case MessageType.LOCATION:
        return <MapPin className="w-4 h-4 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex mb-4",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2",
          isOutbound
            ? "bg-purple-600 text-white"
            : "bg-gray-800 text-gray-100"
        )}
      >
        {/* AI Badge */}
        {message.aiContext?.generatedByAI && (
          <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
            <Bot className="w-3 h-3" />
            <span>Respuesta automática</span>
          </div>
        )}

        {/* Message Type Icon */}
        {message.type !== MessageType.TEXT && (
          <div className="flex items-center text-sm opacity-80 mb-1">
            {getTypeIcon()}
            <span className="capitalize">{message.type}</span>
          </div>
        )}

        {/* Message Content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Media Info */}
        {message.media && message.type === MessageType.AUDIO && (
          <p className="text-xs opacity-70 mt-1">
            Duración: {message.media.seconds}s
          </p>
        )}

        {message.media && message.type === MessageType.LOCATION && (
          <p className="text-xs opacity-70 mt-1">
            📍 {message.media.address || "Ver ubicación"}
          </p>
        )}

        {/* Timestamp and Status */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs opacity-70">
            {format(new Date(message.createdAt), "HH:mm", { locale: es })}
          </span>
          {isOutbound && getStatusIcon()}
        </div>
      </div>
    </div>
  );
}