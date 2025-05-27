// src/app/(dashboard)/onboarding/page.tsx
"use client"

import { useAuthStore } from "@/store/auth.store"
import { motion } from "framer-motion"
import { Sparkles, Building2, Bot, MessageSquare, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState } from "react"

const businessTypes = [
  { id: 'ecommerce', name: 'E-commerce', icon: '🛍️', description: 'Tienda online' },
  { id: 'restaurant', name: 'Restaurante', icon: '🍽️', description: 'Comida y delivery' },
  { id: 'services', name: 'Servicios', icon: '💼', description: 'Consultoría, etc.' },
  { id: 'health', name: 'Salud', icon: '🏥', description: 'Clínica, wellness' },
  { id: 'education', name: 'Educación', icon: '📚', description: 'Cursos, coaching' },
  { id: 'other', name: 'Otro', icon: '🚀', description: 'Personalizado' },
]

export default function OnboardingPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedBusiness, setSelectedBusiness] = useState('')

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      // Ir a la página de instancias de WhatsApp
      router.push('/whatsapp/instances')
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <span className="text-lg font-semibold">Setup Rápido</span>
          </div>
          <Button variant="ghost" onClick={handleSkip}>
            Omitir por ahora
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= i
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {step > i ? <Check className="w-5 h-5" /> : i}
                </div>
                {i < 3 && (
                  <div
                    className={`w-20 h-1 ml-4 ${
                      step > i ? 'bg-purple-500' : 'bg-gray-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Building2 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">
                  ¿Cuál es tu tipo de negocio?
                </h2>
                <p className="text-gray-400">
                  Esto nos ayuda a personalizar tu IA con las mejores respuestas
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all ${
                      selectedBusiness === type.id
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                    }`}
                    onClick={() => setSelectedBusiness(type.id)}
                  >
                    <CardHeader>
                      <div className="text-3xl mb-2">{type.icon}</div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleNext}
                  disabled={!selectedBusiness}
                  className="group"
                >
                  Siguiente
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Bot className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">
                  Personalidad de tu IA
                </h2>
                <p className="text-gray-400">
                  ¿Cómo quieres que tu asistente hable con tus clientes?
                </p>
              </div>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-6">
                  <p className="text-gray-300">
                    Basado en tu tipo de negocio ({businessTypes.find(t => t.id === selectedBusiness)?.name}), 
                    hemos configurado tu IA para ser:
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Amigable y profesional</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Respuestas rápidas y precisas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Enfocada en ventas</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleNext}
                  className="group"
                >
                  Siguiente
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <MessageSquare className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">
                  ¡Último paso! Conecta tu WhatsApp
                </h2>
                <p className="text-gray-400">
                  Escanea el código QR con tu WhatsApp Business
                </p>
              </div>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-8 text-center">
                  <div className="bg-gray-800 w-64 h-64 mx-auto rounded-lg flex items-center justify-center mb-4">
                    <p className="text-gray-500">QR Code aquí</p>
                  </div>
                  <p className="text-sm text-gray-400">
                    Abre WhatsApp en tu teléfono → Menú → Dispositivos vinculados → Vincular dispositivo
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleNext}
                  className="group"
                >
                  Finalizar
                  <Check className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}