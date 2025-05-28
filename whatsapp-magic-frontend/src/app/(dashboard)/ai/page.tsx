// src/app/(dashboard)/ai/page.tsx
"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api-client";
import { QUERY_KEYS } from "@/utils/constants";
import { formatNumber, formatPercentage } from "@/utils/formatters";
import { 
  Bot, 
  Sparkles, 
  Settings, 
  BarChart3, 
  TestTube, 
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Clock,
  Zap
} from "lucide-react";
import toast from "react-hot-toast";

// Schema de validación
const aiConfigSchema = z.object({
  enabled: z.boolean(),
  personality: z.enum(['professional', 'friendly', 'technical', 'sales', 'custom']),
  responseMode: z.enum(['always', 'business_hours', 'outside_hours', 'keywords', 'manual']),
  systemPrompt: z.string().max(2000, 'Máximo 2000 caracteres'),
  welcomeMessage: z.string().max(500, 'Máximo 500 caracteres'),
  keywords: z.array(z.string()),
  settings: z.object({
    temperature: z.number().min(0).max(1),
    maxTokens: z.number().min(50).max(500),
    responseDelay: z.number().min(0).max(10000),
    contextWindow: z.number().min(1).max(10),
    language: z.string(),
  }),
});

type AIConfigFormData = z.infer<typeof aiConfigSchema>;

export default function AIConfigPage() {
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  const queryClient = useQueryClient();

  // Fetch AI config
  const { data: aiConfig, isLoading } = useQuery({
    queryKey: QUERY_KEYS.AI.CONFIG,
    queryFn: async () => {
      const response = await api.get('/ai/config');
      return response.data.data;
    },
  });

  // Fetch AI stats
  const { data: aiStats } = useQuery({
    queryKey: QUERY_KEYS.AI.STATS,
    queryFn: async () => {
      const response = await api.get('/ai/stats');
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh cada 30 segundos
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: QUERY_KEYS.AI.TEMPLATES,
    queryFn: async () => {
      const response = await api.get('/ai/templates');
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    values: aiConfig,
  });

  // Update AI configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (data: AIConfigFormData) => {
      const response = await api.put('/ai/config', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI.CONFIG });
      toast.success('Configuración de IA actualizada');
      reset(aiConfig);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar configuración');
    },
  });

  // Test AI response
  const testAI = async () => {
    if (!testMessage.trim()) {
      toast.error('Escribe un mensaje de prueba');
      return;
    }

    setIsTestingAI(true);
    try {
      const response = await api.post('/ai/test', {
        message: testMessage,
      });
      setTestResponse(response.data.response);
      toast.success('Respuesta generada exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al probar IA');
      setTestResponse(null);
    } finally {
      setIsTestingAI(false);
    }
  };

  // Apply template
  const applyTemplate = async (industryId: string) => {
    try {
      const response = await api.post('/ai/templates/apply', {
        industry: industryId,
      });
      
      // Update form with template values
      const template = response.data.config;
      setValue('systemPrompt', template.systemPrompt);
      setValue('personality', template.personality);
      if (template.settings) {
        setValue('settings.temperature', template.settings.temperature || 0.7);
      }
      
      toast.success(`Plantilla "${industryId}" aplicada`);
    } catch (error: any) {
      toast.error('Error al aplicar plantilla');
    }
  };

  // Quick toggle AI
  const toggleAI = async () => {
    try {
      const newState = !watch('enabled');
      await api.post('/ai/toggle', { enabled: newState });
      setValue('enabled', newState);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI.CONFIG });
      toast.success(`IA ${newState ? 'activada' : 'desactivada'}`);
    } catch (error: any) {
      toast.error('Error al cambiar estado de IA');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-purple-500" />
            Configuración de IA
          </h1>
          <p className="text-gray-400 mt-1">
            Configura tu asistente de WhatsApp con inteligencia artificial
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="ai-toggle">IA Activa</Label>
            <Switch
              id="ai-toggle"
              checked={watch('enabled')}
              onCheckedChange={toggleAI}
            />
          </div>
          <Badge variant={watch('enabled') ? 'connected' : 'disconnected'}>
            {watch('enabled') ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      {aiStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Respuestas IA Hoy
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(aiStats.messages?.handledByAI || 0)}</div>
              <p className="text-xs text-gray-500">
                {formatPercentage(aiStats.messages?.aiResponseRate || 0)} del total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Tiempo Promedio
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aiStats.performance?.averageResponseTime || 0}s</div>
              <p className="text-xs text-gray-500">
                Tiempo de respuesta
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Tokens Usados
              </CardTitle>
              <Zap className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(aiStats.performance?.tokensUsed || 0)}</div>
              <p className="text-xs text-gray-500">
                Este mes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Éxito
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(aiStats.performance?.successRate || 0)}</div>
              <p className="text-xs text-gray-500">
                Tasa de éxito
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit((data) => updateConfigMutation.mutate(data))}>
            {/* Basic Settings */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Personalidad</Label>
                    <select
                      {...register('personality')}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    >
                      <option value="professional">Profesional</option>
                      <option value="friendly">Amigable</option>
                      <option value="technical">Técnico</option>
                      <option value="sales">Ventas</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modo de Respuesta</Label>
                    <select
                      {...register('responseMode')}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    >
                      <option value="always">Siempre responder</option>
                      <option value="business_hours">Solo horario laboral</option>
                      <option value="outside_hours">Fuera de horario</option>
                      <option value="keywords">Solo palabras clave</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensaje de Bienvenida</Label>
                  <Input
                    {...register('welcomeMessage')}
                    placeholder="¡Hola! ¿En qué puedo ayudarte?"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle>Configuración Avanzada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Prompt del Sistema</Label>
                  <textarea
                    {...register('systemPrompt')}
                    className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none"
                    placeholder="Eres un asistente virtual profesional..."
                  />
                  {errors.systemPrompt && (
                    <p className="text-xs text-red-400">{errors.systemPrompt.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperatura ({watch('settings.temperature')})</Label>
                    <input
                      {...register('settings.temperature', { valueAsNumber: true })}
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Creatividad de las respuestas</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Máx. Tokens</Label>
                    <Input
                      {...register('settings.maxTokens', { valueAsNumber: true })}
                      type="number"
                      min="50"
                      max="500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delay de Respuesta (ms)</Label>
                    <Input
                      {...register('settings.responseDelay', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      max="10000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ventana de Contexto</Label>
                    <Input
                      {...register('settings.contextWindow', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                disabled={!isDirty || updateConfigMutation.isPending}
              >
                {updateConfigMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Templates */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Plantillas
              </CardTitle>
              <CardDescription>
                Configura rápidamente la IA para tu industria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates?.map((template: any) => (
                <Button
                  key={template.industry}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => applyTemplate(template.industry)}
                >
                  {template.industry === 'ecommerce' && '🛍️'} 
                  {template.industry === 'restaurant' && '🍽️'} 
                  {template.industry === 'services' && '💼'} 
                  {template.industry === 'health' && '🏥'} 
                  {template.industry === 'education' && '📚'}
                  <span className="ml-2 capitalize">{template.industry}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Test AI */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Probar IA
              </CardTitle>
              <CardDescription>
                Prueba cómo responderá la IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mensaje de prueba</Label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none"
                  placeholder="¿Cuáles son sus horarios?"
                />
              </div>
              
              <Button
                onClick={testAI}
                disabled={isTestingAI || !testMessage.trim()}
                className="w-full"
              >
                {isTestingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Probar Respuesta
                  </>
                )}
              </Button>

              {testResponse && (
                <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-purple-500">
                  <p className="text-sm">{testResponse}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Warning */}
          {aiConfig?.usage && (
            <Alert variant={
              aiConfig.usage.tokensThisMonth / aiConfig.limits.maxTokensPerMonth > 0.8 
                ? 'destructive' 
                : 'warning'
            }>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Uso de tokens:</strong><br />
                {formatNumber(aiConfig.usage.tokensThisMonth)} / {formatNumber(aiConfig.limits.maxTokensPerMonth)}
                ({formatPercentage((aiConfig.usage.tokensThisMonth / aiConfig.limits.maxTokensPerMonth) * 100)})
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}