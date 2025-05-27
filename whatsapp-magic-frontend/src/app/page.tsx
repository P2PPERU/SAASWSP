"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, MessageSquare, Zap, TrendingUp, Sparkles, Check, Star } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--gradient-from)]/20 via-[var(--gradient-via)]/20 to-[var(--gradient-to)]/20" />
      
      {/* Animated Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--gradient-from)] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--gradient-via)] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-[var(--gradient-to)] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold">WhatsApp Magic</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Iniciar Sesión</Button>
              </Link>
              <Link href="/register">
                <Button variant="gradient">Empezar Gratis</Button>
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-[var(--gradient-from)] via-[var(--gradient-via)] to-[var(--gradient-to)] bg-clip-text text-transparent">
              Vende en WhatsApp
              <br />
              <span className="text-4xl md:text-6xl lg:text-7xl">mientras duermes 😴</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              La IA responde por ti, cierra ventas y tú solo cobras. 
              <br />
              <span className="text-[var(--accent)]">Setup en 2 minutos. En serio.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/register">
                <Button 
                  size="xl" 
                  variant="gradient"
                  className="group"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  Prueba 7 días gratis
                  <ArrowRight className={`ml-2 w-5 h-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
                </Button>
              </Link>
              <p className="text-sm text-gray-400">
                Sin tarjeta de crédito • Cancela cuando quieras
              </p>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-black" />
                  ))}
                </div>
                <span className="ml-3 text-sm text-gray-400">+2,847 emprendedores activos</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2 text-sm text-gray-400">4.9/5</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-20">
            <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8" />}
              title="Responde 24/7"
              description="Tu IA nunca duerme. Atiende clientes mientras tú descansas."
              gradient="from-[var(--gradient-from)] to-[var(--gradient-via)]"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Setup en 2 min"
              description="Conecta WhatsApp, elige tu personalidad IA y listo."
              gradient="from-[var(--gradient-from)] to-[var(--gradient-via)]"
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="+47% más ventas"
              description="En promedio, nuestros usuarios venden casi el doble."
              gradient="from-[var(--gradient-from)] to-[var(--gradient-via)]"
            />
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl p-12 backdrop-blur-sm border border-purple-500/20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              ¿Listo para vender en automático?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Únete a miles de emprendedores que ya venden mientras duermen
            </p>
            <Link href="/register">
              <Button size="xl" variant="gradient" className="group">
                Empezar ahora - Es gratis
                <Sparkles className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

// Feature Card Component
function FeatureCard({ icon, title, description, gradient }: any) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative group"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />
      <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors">
        <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${gradient} mb-4`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </motion.div>
  )
}