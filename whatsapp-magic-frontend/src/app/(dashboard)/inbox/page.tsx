// src/app/(dashboard)/inbox/page.tsx
"use client"

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWhatsAppStore } from "@/store/whatsapp.store";
import { ChatList } from "@/components/whatsapp/ChatList";
import { MessageBubble } from "@/components/whatsapp/MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Send, 
  Loader2, 
  MessageSquare, 
  Phone,
  MoreVertical,
  Search,
  Filter
} from "lucide-react";
import toast from "react-hot-toast";

export default function InboxPage() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !selectedInstanceId) return;

    try {
      await sendMessage(selectedInstanceId, {
        to: selectedConversation.contactNumber,
        text: messageText.trim(),
      });
      setMessageText("");
    } catch (error) {
      // Error ya manejado en el store
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contactNumber.includes(searchQuery)
  );

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
          <h2 className="text-xl font-bold mb-4">Conversaciones</h2>
          
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar conversación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700"
            />
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
                  <p className="text-xs text-gray-400">{selectedConversation.contactNumber}</p>
                </div>
              </div>
              
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
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

            {/* Message Input */}
            <div className="bg-gray-900 border-t border-gray-800 p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  className="flex-1 bg-gray-800 border-gray-700"
                  disabled={isSendingMessage}
                />
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
    </div>
  );
}