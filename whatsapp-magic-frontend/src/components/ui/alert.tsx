// src/components/ui/alert.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        warning: "border-yellow-500/50 text-yellow-600 bg-yellow-500/10 [&>svg]:text-yellow-600",
        success: "border-green-500/50 text-green-600 bg-green-500/10 [&>svg]:text-green-600",
        info: "border-blue-500/50 text-blue-600 bg-blue-500/10 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

// WhatsApp specific alert components
interface WhatsAppAlertProps {
  type: 'instance-created' | 'message-sent' | 'connection-lost' | 'rate-limit' | 'api-error' | 'webhook-received'
  title?: string
  message?: string
  instanceName?: string
  onClose?: () => void
}

function WhatsAppAlert({ type, title, message, instanceName, onClose }: WhatsAppAlertProps) {
  const alertConfig = {
    'instance-created': {
      variant: 'success' as const,
      defaultTitle: '✅ Instancia Creada',
      defaultMessage: `La instancia "${instanceName}" ha sido creada exitosamente.`,
    },
    'message-sent': {
      variant: 'success' as const,
      defaultTitle: '📨 Mensaje Enviado',
      defaultMessage: 'Tu mensaje ha sido enviado correctamente.',
    },
    'connection-lost': {
      variant: 'warning' as const,
      defaultTitle: '⚠️ Conexión Perdida',
      defaultMessage: `La instancia "${instanceName}" ha perdido la conexión con WhatsApp.`,
    },
    'rate-limit': {
      variant: 'warning' as const,
      defaultTitle: '🚦 Límite Alcanzado',
      defaultMessage: 'Has alcanzado el límite de mensajes. Intenta más tarde.',
    },
    'api-error': {
      variant: 'destructive' as const,
      defaultTitle: '❌ Error de API',
      defaultMessage: 'Ha ocurrido un error en la conexión con WhatsApp.',
    },
    'webhook-received': {
      variant: 'info' as const,
      defaultTitle: '🔔 Webhook Recibido',
      defaultMessage: 'Se ha recibido un nuevo evento de WhatsApp.',
    },
  }

  const config = alertConfig[type];

  return (
    <Alert variant={config.variant} className="mb-4">
      <AlertTitle>{title || config.defaultTitle}</AlertTitle>
      <AlertDescription>
        {message || config.defaultMessage}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export { Alert, AlertTitle, AlertDescription, WhatsAppAlert }