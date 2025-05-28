// src/components/whatsapp/BulkMessageDialog.tsx
import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMessageSending } from "@/hooks/useWhatsApp";
import { WhatsAppInstance } from "@/types/whatsapp.types";
import { MESSAGE_LIMITS, VALIDATION } from "@/utils/constants";
import { formatNumber, formatEstimatedTime, isValidPhoneNumber } from "@/utils/formatters";
import { Loader2, Upload, X, Users, Clock, Send } from "lucide-react";
import toast from "react-hot-toast";

const bulkMessageSchema = z.object({
  message: z.string()
    .min(1, "El mensaje no puede estar vacío")
    .max(MESSAGE_LIMITS.MAX_LENGTH, `Máximo ${MESSAGE_LIMITS.MAX_LENGTH} caracteres`),
  delayBetweenMessages: z.number()
    .min(1000, "Mínimo 1 segundo entre mensajes")
    .max(60000, "Máximo 60 segundos entre mensajes"),
    
});

type BulkMessageFormData = z.infer<typeof bulkMessageSchema>;

interface BulkMessageDialogProps {
  instance: WhatsAppInstance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkMessageDialog({ instance, open, onOpenChange }: BulkMessageDialogProps) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [step, setStep] = useState<'recipients' | 'message' | 'confirm'>('recipients');
  
  const { sendBulkMessages, isSendingBulk } = useMessageSending(instance.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<BulkMessageFormData>({
    resolver: zodResolver(bulkMessageSchema),
    defaultValues: {
      delayBetweenMessages: 3000,
    },
  });

  const messageValue = watch('message', '');
  const delayValue = watch('delayBetweenMessages', 3000);

  // Agregar destinatario
  const addRecipient = () => {
    const phone = recipientInput.trim();
    
    if (!phone) {
      toast.error('Ingresa un número de teléfono');
      return;
    }
    
    if (!isValidPhoneNumber(phone)) {
      toast.error('Número de teléfono inválido');
      return;
    }
    
    const normalizedPhone = phone.replace(/\D/g, '');
    
    if (recipients.includes(normalizedPhone)) {
      toast.error('Este número ya está en la lista');
      return;
    }
    
    if (recipients.length >= MESSAGE_LIMITS.BULK_MAX_RECIPIENTS) {
      toast.error(`Máximo ${MESSAGE_LIMITS.BULK_MAX_RECIPIENTS} destinatarios`);
      return;
    }
    
    setRecipients([...recipients, normalizedPhone]);
    setRecipientInput('');
  };

  // Remover destinatario
  const removeRecipient = (phone: string) => {
    setRecipients(recipients.filter(p => p !== phone));
  };

  // Procesar archivo CSV
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const phones: string[] = [];

      for (const line of lines) {
        const phone = line.trim().replace(/\D/g, '');
        if (phone && isValidPhoneNumber(phone) && !phones.includes(phone)) {
          phones.push(phone);
          if (phones.length >= MESSAGE_LIMITS.BULK_MAX_RECIPIENTS) break;
        }
      }

      if (phones.length === 0) {
        toast.error('No se encontraron números válidos en el archivo');
        return;
      }

      setRecipients(phones);
      toast.success(`${phones.length} números importados`);
    };

    reader.readAsText(file);
  };

  // Enviar mensajes masivos
  const onSubmit = (data: BulkMessageFormData) => {
    if (recipients.length === 0) {
      toast.error('Agrega al menos un destinatario');
      return;
    }

    sendBulkMessages({
      recipients,
      text: data.message,
      delayBetweenMessages: data.delayBetweenMessages,
    });

    handleClose();
  };

  // Cerrar dialog
  const handleClose = () => {
    setRecipients([]);
    setRecipientInput('');
    setStep('recipients');
    reset();
    onOpenChange(false);
  };

  // Calcular tiempo estimado
  const estimatedTime = recipients.length * delayValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mensajes Masivos - {instance.name}
          </DialogTitle>
          <DialogDescription>
            Envía el mismo mensaje a múltiples contactos. Máximo {MESSAGE_LIMITS.BULK_MAX_RECIPIENTS} destinatarios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'recipients' ? 'bg-purple-500 text-white' : 
                ['message', 'confirm'].includes(step) ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                1
              </div>
              <span className="text-sm">Destinatarios</span>
            </div>
            
            <div className={`w-8 h-1 ${step === 'message' || step === 'confirm' ? 'bg-green-500' : 'bg-gray-700'}`} />
            
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'message' ? 'bg-purple-500 text-white' : 
                step === 'confirm' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                2
              </div>
              <span className="text-sm">Mensaje</span>
            </div>
            
            <div className={`w-8 h-1 ${step === 'confirm' ? 'bg-green-500' : 'bg-gray-700'}`} />
            
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'confirm' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                3
              </div>
              <span className="text-sm">Confirmar</span>
            </div>
          </div>

          {/* Step 1: Recipients */}
          {step === 'recipients' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Agregar Destinatarios</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Número de teléfono (ej: +51999123456)"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                  />
                  <Button onClick={addRecipient} disabled={!recipientInput.trim()}>
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>O importar desde archivo CSV</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('csv-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </Button>
                  <span className="text-xs text-gray-400">
                    Un número por línea
                  </span>
                </div>
              </div>

              {recipients.length > 0 && (
                <div className="space-y-2">
                  <Label>Destinatarios ({recipients.length}/{MESSAGE_LIMITS.BULK_MAX_RECIPIENTS})</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded">
                    {recipients.map((phone, index) => (
                      <div key={phone} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded">
                        <span className="text-sm">{phone}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(phone)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Message */}
          {step === 'message' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <textarea
                  {...register('message')}
                  className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none"
                  placeholder="Escribe tu mensaje aquí..."
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{messageValue.length} / {MESSAGE_LIMITS.MAX_LENGTH} caracteres</span>
                  {errors.message && (
                    <span className="text-red-400">{errors.message.message}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay">Delay entre mensajes (milisegundos)</Label>
                <Input
                  {...register('delayBetweenMessages', { valueAsNumber: true })}
                  type="number"
                  min={1000}
                  max={60000}
                  step={500}
                />
                <div className="text-xs text-gray-400">
                  Recomendado: 3000ms (3 segundos) para evitar ser bloqueado
                </div>
                {errors.delayBetweenMessages && (
                  <p className="text-xs text-red-400">{errors.delayBetweenMessages.message}</p>
                )}
              </div>

              <Alert>
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Tiempo estimado: {formatEstimatedTime(estimatedTime / 1000)}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Revisa antes de enviar:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• {formatNumber(recipients.length)} destinatarios</li>
                    <li>• Mensaje de {messageValue.length} caracteres</li>
                    <li>• Delay de {delayValue}ms entre mensajes</li>
                    <li>• Tiempo estimado: {formatEstimatedTime(estimatedTime / 1000)}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-800 p-4 rounded-lg">
                <Label className="text-sm font-medium">Vista previa del mensaje:</Label>
                <div className="mt-2 p-3 bg-gray-900 rounded border-l-4 border-purple-500">
                  <p className="text-sm whitespace-pre-wrap">{messageValue}</p>
                </div>
              </div>

              <Alert variant="warning">
                <AlertDescription>
                  Los mensajes se enviarán uno por uno con el delay configurado. 
                  Una vez iniciado, no se puede cancelar.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 'recipients' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep('message')}
                disabled={recipients.length === 0}
              >
                Siguiente ({recipients.length} destinatarios)
              </Button>
            </>
          )}

          {step === 'message' && (
            <>
              <Button variant="outline" onClick={() => setStep('recipients')}>
                Atrás
              </Button>
              <Button 
                onClick={() => setStep('confirm')}
                disabled={!messageValue.trim() || !!errors.message}
              >
                Siguiente
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('message')}>
                Atrás
              </Button>
              <Button 
                onClick={handleSubmit(onSubmit)}
                disabled={isSendingBulk}
                variant="gradient"
              >
                {isSendingBulk ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar {formatNumber(recipients.length)} Mensajes
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}