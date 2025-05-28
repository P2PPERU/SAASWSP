// src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // WhatsApp specific variants
        connected: "border-transparent bg-green-500/20 text-green-400 border-green-500/20",
        connecting: "border-transparent bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
        disconnected: "border-transparent bg-gray-500/20 text-gray-400 border-gray-500/20",
        failed: "border-transparent bg-red-500/20 text-red-400 border-red-500/20",
        // Message status variants
        pending: "border-transparent bg-blue-500/20 text-blue-400 border-blue-500/20",
        sent: "border-transparent bg-gray-500/20 text-gray-400 border-gray-500/20",
        delivered: "border-transparent bg-green-500/20 text-green-400 border-green-500/20",
        read: "border-transparent bg-purple-500/20 text-purple-400 border-purple-500/20",
        // AI variants
        ai: "border-transparent bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }