// src/app/(dashboard)/whatsapp/instances/page.tsx
"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWhatsAppStore } from "@/store/whatsapp.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstanceCard } from "@/components/whatsapp/InstanceCard";
import { QRCodeDialog } from "@/components/whatsapp/QRCodeDialog";
import { WhatsAppInstance } from "@/types/whatsapp.types";
import { Plus, Loader2, MessageSquare, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function WhatsAppInstancesPage() {
  const router = useRouter();
  const { 
    instances, 
    isLoading,
    fetchInstances,
    createInstance,
    connectInstance,
    disconnectInstance,
    deleteInstance 
  } = useWhatsAppStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error("Por favor ingresa un nombre para la instancia");
      return;
    }

    setIsCreating(true);
    try {
      await createInstance({ name: newInstanceName });
      setShowCreateDialog(false);
      setNewInstanceName("");
    } catch (error) {
      // El error ya se maneja en el store
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setShowQRDialog(true);
    await connectInstance(instance.id);
  };

  const handleDisconnect = async (instance: WhatsAppInstance) => {
    if (confirm("¿Estás seguro de desconectar esta instancia?")) {
      await disconnectInstance(instance.id);
    }
  };

  const handleDelete = async (instance: WhatsAppInstance) => {
    if (confirm(`¿Estás seguro de eliminar "${instance.name}"? Esta acción no se puede deshacer.`)) {
      await deleteInstance(instance.id);
    }
  };

  const handleViewChats = (instance: WhatsAppInstance) => {
    router.push(`/inbox?instanceId=${instance.id}`);
  };

  if (isLoading && instances.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Instancias de WhatsApp</h1>
          <p className="text-gray-400">
            Gestiona tus conexiones de WhatsApp Business
          </p>
        </div>

        <Button
          variant="gradient"
          onClick={() => setShowCreateDialog(true)}
          className="group"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Instancia
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Instancias
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instances.length}</div>
            <p className="text-xs text-gray-500">
              {instances.filter(i => i.status === 'connected').length} conectadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Mensajes Hoy
            </CardTitle>
            <Zap className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              0 respuestas automáticas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Conversaciones Activas
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              0 sin responder
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instances Grid */}
      {instances.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay instancias</h3>
            <p className="text-gray-400 text-center mb-4">
              Crea tu primera instancia para empezar a recibir mensajes
            </p>
            <Button
              variant="gradient"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Primera Instancia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance, index) => (
            <motion.div
              key={instance.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <InstanceCard
                instance={instance}
                onConnect={() => handleConnect(instance)}
                onDisconnect={() => handleDisconnect(instance)}
                onDelete={() => handleDelete(instance)}
                onViewChats={() => handleViewChats(instance)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Instance Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Instancia</DialogTitle>
            <DialogDescription>
              Dale un nombre a tu nueva conexión de WhatsApp Business
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la instancia</Label>
              <Input
                id="name"
                placeholder="Ej: Ventas Principal, Soporte, etc."
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateInstance()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              variant="gradient"
              onClick={handleCreateInstance}
              disabled={isCreating || !newInstanceName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Instancia"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {selectedInstance && (
        <QRCodeDialog
          instance={selectedInstance}
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
        />
      )}
    </div>
  );
}