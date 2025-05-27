import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { Toaster } from "react-hot-toast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WhatsApp Magic ✨ - Vende en automático mientras duermes",
  description: "La plataforma de WhatsApp Business con IA que los emprendedores aman. Setup en 2 minutos.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#18181b',
                color: '#fff',
                borderRadius: '0.5rem',
                fontSize: '14px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}