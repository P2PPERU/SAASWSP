// src/components/whatsapp/ScheduleMessageDialog.tsx
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMessageSending } from "@/hooks/useWhatsApp";
import { WhatsAppInstance } from "@/types/whatsapp.types";
import { MESSAGE_LIMITS } from "@/utils/constants";
import { formatFullDate, isValidPhoneNumber } from "@/utils/formatters";
import { Loader2, Calendar, Clock, Send, AlertCircle } from "lucide-react";
import { format, addHours, addDays, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from "react-hot-toast";

const scheduleMessageSchema = z.object({
  to: z.string()
    .min(1, "El número es requerido")
    .refine(isValidPhoneNumber, "Número de teléfono inválido"),
  message: z.string()
    .min(1, "El mensaje no puede estar vacío")
    .max(MESSAGE_LIMITS.MAX_LENGTH, `Máximo ${MESSAGE_LIMITS.MAX_LENGTH} caracteres`),
  sendAt: z.string()
    .min(1, "Selecciona fecha y hora")
    .refine((date) => {
      const selectedDate = new Date(date);
      const now = new Date();
      return selectedDate > now;
    }, "La fecha debe ser futura"),
});

type ScheduleMessageFormData = z.infer<typeof scheduleMessageSchema>;

interface ScheduleMessageDialogProps {
  instance: WhatsAppInstance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRecipient?: string;
}

export function ScheduleMessageDialog({ 
  instance, 
  open, 
  onOpenChange, 
  initialRecipient 
}: ScheduleMessageDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  const { scheduleMessage, isScheduling } = useMessageSending(instance.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ScheduleMessageFormData>({
    resolver: zodResolver(scheduleMessageSchema),
    defaultValues: {
      to: initialRecipient || '',
      message: '',
      sendAt: '',
    },
  });

  const messageValue = watch('message', '');
  const sendAtValue = watch('sendAt', '');

  // Presets de tiempo común
  const timePresets = [
    {
      id: '1hour',
      label: 'En 1 hora',
      getValue: () => format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: '3hours',
      label: 'En 3 horas',
      getValue: () => format(addHours(new Date(), 3), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: 'tomorrow9am',
      label: 'Mañana 9:00 AM',
      getValue: () => {
        const tomorrow = addDays(new Date(), 1);
        tomorrow.setHours(9, 0, 0, 0);
        return format(tomorrow, "yyyy-MM-dd'T'HH:mm");
      },
    },
    {
      id: 'tomorrow2pm',
      label: 'Mañana 2:00 PM',
      getValue: () => {
        const tomorrow = addDays(new Date(), 1);
        tomorrow.setHours(14, 0, 0, 0);
        return format(tomorrow, "yyyy-MM-dd'T'HH:mm");
      },
    },
    {
      id: 'nextweek',
      label: 'Próxima semana',
      getValue: () => {
        const nextWeek = addWeeks(new Date(), 1);
        nextWeek.setHours(9, 0, 0, 0);
        return format(nextWeek, "yyyy-MM-dd'T'HH:mm");
      },
    },
  ];

  // Plantillas de mensaje comunes
  const messageTemplates = [
    {
      id: 'reminder',
      label: 'Recordatorio',
      content: 'Hola! Te recuerdo que tienes una cita programada. ¡No olvides confirmar tu asistencia!',
    },
    {
      id: 'followup',
      label: 'Seguimiento',
      content: 'Hola! ¿Cómo has estado? Quería hacer seguimiento sobre nuestra conversación anterior.',
    },
    {
      id: 'promotion',
      label: 'Promoción',
      content: '🎉 ¡Oferta especial! No te pierdas nuestra promoción por tiempo limitado.',
    },
    {
      id: 'birthday',
      label: 'Cumpleaños',
      content: '🎂 ¡Feliz cumpleaños! Esperamos que tengas un día maravilloso.',
    },
    {
      id: 'custom',
      label: 'Personalizado',
      content: '',
    },
  ];

  // Seleccionar preset de tiempo
  const selectTimePreset = (presetId: string) => {
    const preset = timePresets.find(p => p.id === presetId);
    if (preset) {
      setValue('sendAt', preset.getValue());
      setSelectedPreset(presetId);
    }
  };

  // Seleccionar plantilla de mensaje
  const selectMessageTemplate = (template: typeof messageTemplates[0]) => {
    setValue('message', template.content);
  };

  // Enviar mensaje programado
  const onSubmit = (data: ScheduleMessageFormData) => {
    scheduleMessage({
      to: data.to.replace(/\D/g, ''), // Limpiar número
      text: data.message,
      sendAt: data.sendAt,
    });

    handleClose();
  };

  // Cerrar dialog
  const handleClose = () => {
    reset();
    setSelectedPreset(null);
    onOpenChange(false);
  };

  // Obtener fecha formateada
  const getFormattedSendDate = () => {
    if (!sendAtValue) return null;
    try {
      return formatFullDate(new Date(sendAtValue));
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programar Mensaje - {instance.name}
          </DialogTitle>
          <DialogDescription>
            Programa un mensaje para enviarse automáticamente en una fecha y hora específica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="to">Destinatario</Label>
            <Input
              {...register('to')}
              placeholder="Número de teléfono (ej: +51999123456)"
              className={errors.to ? 'border-red-500' : ''}
            />
            {errors.to && (
              <p className="text-xs text-red-400">{errors.to.message}</p>
            )}
          </div>

          {/* Message Templates */}
          <div className="space-y-2">
            <Label>Plantillas de Mensaje</Label>
            <div className="grid grid-cols-2 gap-2">
              {messageTemplates.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectMessageTemplate(template)}
                  className="justify-start"
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <textarea
              {...register('message')}
              className={`w-full h-32 px-3 py-2 bg-gray-800 border rounded-lg resize-none ${
                errors.message ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="Escribe tu mensaje aquí..."
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{messageValue.length} / {MESSAGE_LIMITS.MAX_LENGTH} caracteres</span>
              {errors.message && (
                <span className="text-red-400">{errors.message.message}</span>
              )}
            </div>
          </div>

          {/* Time Presets */}
          <div className="space-y-2">
            <Label>Programar para</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {timePresets.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant={selectedPreset === preset.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectTimePreset(preset.id)}
                  className="justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="sendAt">O selecciona fecha y hora específica</Label>
            <Input
              {...register('sendAt')}
              type="datetime-local"
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              className={errors.sendAt ? 'border-red-500' : ''}
            />
            {errors.sendAt && (
              <p className="text-xs text-red-400">{errors.sendAt.message}</p>
            )}
          </div>

          {/* Preview */}
          {sendAtValue && getFormattedSendDate() && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>El mensaje se enviará:</strong><br />
                {getFormattedSendDate()}
              </AlertDescription>
            </Alert>
          )}

          {/* Message Preview */}
          {messageValue && (
            <div className="space-y-2">
              <Label>Vista previa del mensaje</Label>
              <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-purple-500">
                <p className="text-sm whitespace-pre-wrap">{messageValue}</p>
              </div>
            </div>
          )}

          {/* Warning */}
          <Alert variant="warning">
            <AlertDescription>
              El mensaje se enviará automáticamente en la fecha y hora programada. 
              Asegúrate de que la instancia de WhatsApp esté conectada en ese momento.
            </AlertDescription>
          </Alert>
        </form>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            disabled={isScheduling}
            variant="gradient"
          >
            {isScheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Programando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Programar Mensaje
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}