// src/components/whatsapp/ChatList.tsx
import { Conversation } from "@/types/whatsapp.types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, User } from "lucide-react";
import { cn } from "@/utils/cn";

interface ChatListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  isLoading?: boolean;
}

export function ChatList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isLoading = false,
}: ChatListProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Cargando conversaciones...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="w-12 h-12 text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay conversaciones</h3>
        <p className="text-sm text-gray-400">
          Las conversaciones aparecerán aquí cuando recibas mensajes
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation)}
          className={cn(
            "w-full px-4 py-3 hover:bg-gray-800/50 transition-colors text-left",
            "focus:outline-none focus:bg-gray-800/50",
            selectedConversationId === conversation.id && "bg-gray-800/50"
          )}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-gray-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h4 className="text-sm font-semibold truncate">
                  {conversation.contactName}
                </h4>
                {conversation.lastMessageAt && (
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                      addSuffix: false,
                      locale: es,
                    })}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 truncate">
                {conversation.contactNumber}
              </p>

              {/* Unread badge */}
              {conversation.unreadCount > 0 && (
                <div className="mt-1">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                    {conversation.unreadCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}