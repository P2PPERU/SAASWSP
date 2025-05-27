// src/app/(dashboard)/whatsapp/[id]/page.tsx
"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWhatsAppStore } from "@/store/whatsapp.store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/components/whatsapp/ConnectionStatus";
import { Loader2, CheckCircle, RefreshCw, ArrowLeft, MessageSquare } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function WhatsAppInstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const instanceId = params.id as string;

  const { 
    instances, 
    checkConnectionStatus, 
    connectInstance,
    fetchInstances 
  } = useWhatsAppStore();

  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const instance = instances.find(inst => inst.id === instanceId);

  useEffect(() => {
    if (instances.length === 0) {
      fetchInstances();
    }
  }, [instances.length, fetchInstances]);

  useEffect(() => {
    if (!instance) return;

    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const status = await checkConnectionStatus(instanceId);
        setConnectionStatus(status);
        setIsLoading(false);

        // Si está conectado, dejar de hacer polling
        if (status.connected) {
          if (interval) clearInterval(interval);
        }
      } catch (error) {
        console.error("Error checking status:", error);
        setError("Error al verificar el estado de conexión");
        setIsLoading(false);
      }
    };

    // Check inicial
    checkStatus();

    // Polling cada 3 segundos si no está conectado
    if (!connectionStatus?.connected) {
      interval = setInterval(checkStatus, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [instanceId, instance, checkConnectionStatus, connectionStatus?.connected]);

  const handleRetryConnection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await connectInstance(instanceId);
    } catch (error) {
      setError("Error al generar código QR");
    }
    setIsLoading(false);
  };

  if (!instance) {
    return (
      <div className="p-8">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-12 text-center">
            <p className="text-gray-400">Instancia no encontrada</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push("/whatsapp/instances")}
            >
              Volver a instancias
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/whatsapp/instances")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{instance.name}</h1>
            <p className="text-gray-400">Configuración de conexión WhatsApp</p>
          </div>
        </div>
        <ConnectionStatus status={connectionStatus?.status || instance.status} />
      </div>

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Connection Card */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Estado de Conexión</CardTitle>
            <CardDescription>
              {connectionStatus?.connected 
                ? "Tu WhatsApp está conectado y listo para usar"
                : "Escanea el código QR para conectar tu WhatsApp"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-16 h-16 animate-spin text-purple-500 mb-4" />
                <h3 className="text-xl font-semibold">Cargando...</h3>
              </div>
            ) : connectionStatus?.connected ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">¡Conectado exitosamente!</h3>
                  {connectionStatus.phoneNumber && (
                    <p className="text-gray-400">Número: {connectionStatus.phoneNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Última conexión</p>
                    <p className="font-medium">
                      {connectionStatus.lastConnectionAt 
                        ? format(new Date(connectionStatus.lastConnectionAt), "dd/MM/yyyy HH:mm", { locale: es })
                        : "N/A"
                      }
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Instance Key</p>
                    <p className="font-medium font-mono text-sm truncate">{instance.instanceKey}</p>
                  </div>
                </div>

                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={() => router.push(`/inbox?instanceId=${instance.id}`)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Ver Conversaciones
                </Button>
              </div>
            ) : connectionStatus?.qrCode ? (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg mx-auto max-w-sm">
                  {connectionStatus.qrCode.startsWith("data:image") ? (
                    <Image
                      src={connectionStatus.qrCode}
                      alt="WhatsApp QR Code"
                      width={300}
                      height={300}
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="font-mono text-xs whitespace-pre-wrap break-all text-black">
                      {connectionStatus.qrCode}
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Instrucciones:</h4>
                  <ol className="text-sm text-gray-400 space-y-2">
                    <li>1. Abre WhatsApp en tu teléfono</li>
                    <li>2. Ve a <strong className="text-white">Menú → Dispositivos vinculados</strong></li>
                    <li>3. Toca <strong className="text-white">Vincular dispositivo</strong></li>
                    <li>4. Escanea este código QR</li>
                  </ol>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRetryConnection}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar Código QR
                </Button>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={handleRetryConnection} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No hay código QR disponible</p>
                <Button onClick={handleRetryConnection} variant="gradient">
                  Generar Código QR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instance Info */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Información de la Instancia</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-400">ID</dt>
                <dd className="font-mono text-sm">{instance.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Creada</dt>
                <dd>{format(new Date(instance.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Estado</dt>
                <dd className="capitalize">{connectionStatus?.status || instance.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Número</dt>
                <dd>{connectionStatus?.phoneNumber || instance.phoneNumber || "No conectado"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}