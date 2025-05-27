// src/app/(auth)/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Sparkles, Mail, Lock, User, Building, ArrowRight, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth.store"

// Esquema de validación
const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  organizationName: z.string().min(2, "El nombre de la empresa debe tener al menos 2 caracteres"),
})

type RegisterFormData = z.infer<typeof registerSchema>

// Beneficios del plan
const benefits = [
  "7 días gratis sin tarjeta",
  "IA configurada en 2 minutos",
  "Soporte 24/7 por WhatsApp",
  "Cancela cuando quieras"
]

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser, isLoading, error } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1) // 1: datos personales, 2: empresa

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    await registerUser(data)
    // Si el registro es exitoso, el store redirigirá
    if (useAuthStore.getState().isAuthenticated) {
      router.push("/onboarding")
    }
  }

  const nextStep = async () => {
    // Validar campos del paso actual
    const fieldsToValidate = step === 1 ? ["name", "email", "password"] : ["organizationName"]
    const isValid = await trigger(fieldsToValidate as any)
    
    if (isValid) {
      setStep(2)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--gradient-from)]/20 via-[var(--gradient-via)]/20 to-[var(--gradient-to)]/20" />
      
      {/* Animated Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute top-40 right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute bottom-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Benefits */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block"
        >
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Únete a +2,847 emprendedores que venden mientras duermen
          </h2>
          
          <div className="space-y-4 mb-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                className="flex items-center space-x-3"
              >
                <CheckCircle className="w-5 h-5 text-[var(--accent)]" />
                <span className="text-gray-300">{benefit}</span>
              </motion.div>
            ))}
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-2">Lo que dicen nuestros usuarios:</p>
            <blockquote className="text-lg italic text-gray-300">
              "En solo 2 días ya había recuperado la inversión. La IA responde mejor que yo 😅"
            </blockquote>
            <p className="text-sm text-gray-500 mt-2">- María, Tienda de Ropa</p>
          </div>
        </motion.div>

        {/* Right Side - Register Form */}
        <div>
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 lg:hidden"
          >
            <Link href="/" className="inline-flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold">WhatsApp Magic</span>
            </Link>
          </motion.div>

          {/* Register Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  {step === 1 ? "Crea tu cuenta gratis 🚀" : "Cuéntanos sobre tu negocio 💼"}
                </CardTitle>
                <CardDescription className="text-center text-gray-400">
                  {step === 1 
                    ? "Setup en 2 minutos. En serio." 
                    : "Esto nos ayuda a personalizar tu IA"}
                </CardDescription>
                
                {/* Progress Steps */}
                <div className="flex items-center justify-center mt-4 space-x-2">
                  <div className={`h-2 w-20 rounded-full ${step >= 1 ? 'bg-[var(--accent)]' : 'bg-gray-700'}`} />
                  <div className={`h-2 w-20 rounded-full ${step >= 2 ? 'bg-[var(--accent)]' : 'bg-gray-700'}`} />
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {step === 1 ? (
                    <>
                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-300">
                          Tu nombre
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="name"
                            type="text"
                            placeholder="Juan Pérez"
                            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[var(--gradient-from)]"
                            {...register("name")}
                          />
                        </div>
                        {errors.name && (
                          <p className="text-red-400 text-sm">{errors.name.message}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="tu@email.com"
                            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[var(--gradient-from)]"
                            {...register("email")}
                          />
                        </div>
                        {errors.email && (
                          <p className="text-red-400 text-sm">{errors.email.message}</p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-300">
                          Contraseña
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[var(--gradient-from)]"
                            {...register("password")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                          >
                            {showPassword ? "Ocultar" : "Mostrar"}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-red-400 text-sm">{errors.password.message}</p>
                        )}
                        
                        {/* Password requirements */}
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">La contraseña debe tener:</p>
                          <p className="text-xs text-gray-500">• Al menos 6 caracteres</p>
                          <p className="text-xs text-gray-500">• Una letra mayúscula</p>
                          <p className="text-xs text-gray-500">• Un número</p>
                        </div>
                      </div>

                      {/* Next Button */}
                      <Button
                        type="button"
                        size="lg"
                        variant="gradient"
                        className="w-full group"
                        onClick={nextStep}
                      >
                        Siguiente
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Organization Name */}
                      <div className="space-y-2">
                        <Label htmlFor="organizationName" className="text-gray-300">
                          Nombre de tu empresa
                        </Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="organizationName"
                            type="text"
                            placeholder="Mi Empresa SAS"
                            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[var(--gradient-from)]"
                            {...register("organizationName")}
                          />
                        </div>
                        {errors.organizationName && (
                          <p className="text-red-400 text-sm">{errors.organizationName.message}</p>
                        )}
                      </div>

                      {/* Error Message */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                        >
                          {error}
                        </motion.div>
                      )}

                      {/* Buttons */}
                      <div className="space-y-3">
                        <Button
                          type="submit"
                          size="lg"
                          variant="gradient"
                          className="w-full group"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creando tu cuenta...
                            </>
                          ) : (
                            <>
                              Crear cuenta y empezar gratis
                              <Sparkles className="ml-2 w-4 h-4" />
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => setStep(1)}
                        >
                          Volver
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </CardContent>

              <CardFooter className="text-center">
                <p className="text-sm text-gray-400 w-full">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
                    Inicia sesión
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Terms */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-gray-500 mt-8"
          >
            Al registrarte, aceptas nuestros{" "}
            <Link href="/terms" className="underline hover:text-gray-300">
              Términos de Servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="underline hover:text-gray-300">
              Política de Privacidad
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  )
}