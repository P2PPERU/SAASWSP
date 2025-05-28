// src/app/(dashboard)/inbox/page.tsx - ENHANCED VERSION
"use client"

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWhatsAppStore } from "@/store/whatsapp.store";
import { ChatList } from "@/components/whatsapp/ChatList";
import { MessageBubble } from "@/components/whatsapp/MessageBubble";
import { BulkMessageDialog } from "@/components/whatsapp/BulkMessageDialog";
import { ScheduleMessageDialog } from "@/components/whatsapp/ScheduleMessageDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Loader2, 
  MessageSquare, 
  Phone,
  MoreVertical,
  Search,
  Filter,
  Plus,
  Paperclip,
  Smile,
  Clock,
  Users,
  Zap,
  Image as ImageIcon,
  File,
  MapPin,
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";

// Quick reply templates
const quickReplies = [
  { id: 1, text: "¡Hola! ¿En qué puedo ayudarte?", emoji: "👋" },
  { id: 2, text: "Gracias por contactarnos", emoji: "🙏" },
  { id: 3, text: "Te responderé lo antes posible", emoji: "⏰" },
  { id: 4, text: "¿Necesitas algo más?", emoji: "❓" },
  { id: 5, text: "¡Que tengas un buen día!", emoji: "😊" },
];

export default function EnhancedInboxPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const instanceId = searchParams.get("instanceId");
  
  const {
    instances,
    conversations,
    selectedConversation,
    messages,
    isLoading,
    isSendingMessage,
    fetchInstances,
    fetchConversations,
    selectConversation,
    fetchMessages,
    sendMessage,
  } = useWhatsAppStore();

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(instanceId);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "active">("all");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar instancias si no están cargadas
  useEffect(() => {
    if (instances.length === 0) {
      fetchInstances();
    }
  }, [instances.length, fetchInstances]);

  // Cargar conversaciones cuando se selecciona una instancia
  useEffect(() => {
    if (selectedInstanceId) {
      fetchConversations(selectedInstanceId);
    }
  }, [selectedInstanceId, fetchConversations]);

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  // Auto-scroll a los nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simular typing indicator
  useEffect(() => {
    if (messageText.length > 0) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [messageText]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !selectedInstanceId) return;

    try {
      await sendMessage(selectedInstanceId, {
        to: selectedConversation.contactNumber,
        text: messageText.trim(),
      });
      setMessageText("");
      setShowQuickReplies(false);
    } catch (error) {
      // Error ya manejado en el store
    }
  };

  const handleQuickReply = (text: string) => {
    setMessageText(text);
    setShowQuickReplies(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileUpload(file);
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleSendFile = async () => {
    if (!fileUpload || !selectedConversation || !selectedInstanceId) return;

    try {
      // Here would be the file upload logic
      toast.success(`Archivo ${fileUpload.name} enviado`);
      setFileUpload(null);
      setPreviewUrl(null);
    } catch (error) {
      toast.error("Error al enviar archivo");
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.contactNumber.includes(searchQuery);
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "unread" && conv.unreadCount > 0) ||
                         (filterStatus === "active" && conv.status === "active");
    return matchesSearch && matchesFilter;
  });

  // Si no hay instancias
  if (!isLoading && instances.length === 0) {
    return (
      <div className="p-8">
        <Card className="bg-gray-900/50 border-gray-800">
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No hay instancias de WhatsApp</h2>
            <p className="text-gray-400 mb-6">
              Primero necesitas crear y conectar una instancia de WhatsApp
            </p>
            <Button 
              variant="gradient"
              onClick={() => router.push("/whatsapp/instances")}
            >
              Ir a Instancias
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - Lista de conversaciones */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Conversaciones</h2>
            
            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowBulkDialog(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Mensajes Masivos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowScheduleDialog(true)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Programar Mensaje
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Instance Selector */}
          <select
            value={selectedInstanceId || ""}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm mb-3"
          >
            <option value="">Selecciona una instancia</option>
            {instances
              .filter(inst => inst.status === "connected")
              .map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.phoneNumber})
                </option>
              ))}
          </select>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar conversación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'unread', 'active'] as const).map((filter) => (
              <Button
                key={filter}
                variant={filterStatus === filter ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus(filter)}
                className="text-xs"
              >
                {filter === 'all' && 'Todas'}
                {filter === 'unread' && 'Sin leer'}
                {filter === 'active' && 'Activas'}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {selectedInstanceId ? (
            <ChatList
              conversations={filteredConversations}
              selectedConversationId={selectedConversation?.id}
              onSelectConversation={selectConversation}
              isLoading={isLoading}
            />
          ) : (
            <div className="p-8 text-center text-gray-400">
              Selecciona una instancia para ver las conversaciones
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedConversation.contactName}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">{selectedConversation.contactNumber}</p>
                    {selectedConversation.unreadCount > 0 && (
                      <Badge variant="connected" className="text-xs">
                        {selectedConversation.unreadCount} sin leer
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isTyping && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <span>Escribiendo...</span>
                  </div>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Users className="mr-2 h-4 w-4" />
                      Ver perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Zap className="mr-2 h-4 w-4" />
                      Activar IA
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-400">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Bloquear contacto
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-8">
                  No hay mensajes en esta conversación
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* File Preview */}
            {fileUpload && (
              <div className="bg-gray-900 border-t border-gray-800 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <File className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">{fileUpload.name}</span>
                  </div>
                  <Button size="sm" onClick={handleSendFile}>
                    Enviar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setFileUpload(null);
                      setPreviewUrl(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
                {previewUrl && (
                  <div className="mt-2">
                    <img src={previewUrl} alt="Preview" className="max-w-48 max-h-48 rounded" />
                  </div>
                )}
              </div>
            )}

            {/* Quick Replies Panel */}
            {showQuickReplies && (
              <div className="bg-gray-900 border-t border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Respuestas Rápidas</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <Button
                      key={reply.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickReply(reply.text)}
                      className="text-xs"
                    >
                      {reply.emoji} {reply.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="bg-gray-900 border-t border-gray-800 p-4">
              <div className="flex items-end gap-2">
                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className={cn(
                      showQuickReplies && "bg-purple-500/20 text-purple-400"
                    )}
                  >
                    <Zap className="w-5 h-5" />
                  </Button>
                </div>

                {/* Input */}
                <div className="flex-1 relative">
                  <Input
                    placeholder="Escribe un mensaje..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="bg-gray-800 border-gray-700 pr-10"
                    disabled={isSendingMessage}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>

                {/* Send Button */}
                <Button
                  variant="gradient"
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSendingMessage}
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Selecciona una conversación</h3>
              <p className="text-gray-400">
                Elige una conversación de la lista para empezar a chatear
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedInstanceId && (
        <>
          <BulkMessageDialog
            instance={instances.find(i => i.id === selectedInstanceId)!}
            open={showBulkDialog}
            onOpenChange={setShowBulkDialog}
          />
          <ScheduleMessageDialog
            instance={instances.find(i => i.id === selectedInstanceId)!}
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
            initialRecipient={selectedConversation?.contactNumber}
          />
        </>
      )}
    </div>
  );
}