// src/components/whatsapp/QRCodeDialog.tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";
import { WhatsAppInstance, InstanceStatus } from "@/types/whatsapp.types";
import { useWhatsAppStore } from "@/store/whatsapp.store";
import Image from "next/image";

interface QRCodeDialogProps {
  instance: WhatsAppInstance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeDialog({ instance, open, onOpenChange }: QRCodeDialogProps) {
  const { checkConnectionStatus, connectInstance } = useWhatsAppStore();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<InstanceStatus>(instance.status);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  // Polling para verificar estado de conexión
  useEffect(() => {
    if (!open) return;

    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await checkConnectionStatus(instance.id);
        setStatus(response.status);
        setPhoneNumber(response.phoneNumber || null);

        if (response.connected) {
          // Conectado exitosamente
          setQrCode(null);
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
        } else if (response.qrCode) {
          // Actualizar QR si cambió
          setQrCode(response.qrCode);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking status:", error);
        setError("Error al verificar el estado de conexión");
      }
    };

    // Check inicial
    checkStatus();

    // Polling cada 3 segundos
    interval = setInterval(checkStatus, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open, instance.id, checkConnectionStatus, onOpenChange]);

  const handleRetry = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await connectInstance(instance.id);
    } catch (error) {
      setError("Error al generar código QR");
    }
  };

  const renderContent = () => {
    if (status === InstanceStatus.CONNECTED) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">¡Conectado exitosamente!</h3>
          {phoneNumber && (
            <p className="text-gray-400">Número: {phoneNumber}</p>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error de conexión</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      );
    }

    if (isLoading || !qrCode) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-16 h-16 animate-spin text-purple-500 mb-4" />
          <h3 className="text-xl font-semibold">Generando código QR...</h3>
        </div>
      );
    }

    return (
      <>
        <div className="bg-white p-4 rounded-lg mb-4">
          {qrCode.startsWith("data:image") ? (
            <Image
              src={qrCode}
              alt="WhatsApp QR Code"
              width={300}
              height={300}
              className="w-full h-auto"
            />
          ) : (
            <div className="font-mono text-xs whitespace-pre-wrap break-all">
              {qrCode}
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium">Para conectar:</h4>
          <ol className="text-sm text-gray-400 space-y-2">
            <li>1. Abre WhatsApp en tu teléfono</li>
            <li>2. Ve a <strong>Menú → Dispositivos vinculados</strong></li>
            <li>3. Toca <strong>Vincular dispositivo</strong></li>
            <li>4. Escanea este código QR</li>
          </ol>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Conectar {instance.name}
            <ConnectionStatus status={status} showText={false} />
          </DialogTitle>
          <DialogDescription>
            Escanea el código QR con tu WhatsApp Business
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}