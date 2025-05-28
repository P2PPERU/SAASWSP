// src/app/(dashboard)/analytics/page.tsx
"use client"

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { QUERY_KEYS } from "@/utils/constants";
import { formatNumber, formatPercentage, formatRelativeDate } from "@/utils/formatters";
import { 
  BarChart3, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  Bot,
  Zap,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Timer
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Period = 'today' | 'week' | 'month';

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');

  // Fetch dashboard analytics
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS.DASHBOARD, selectedPeriod],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard?period=${selectedPeriod}`);
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh cada 30 segundos
  });

  // Fetch usage patterns
  const { data: usagePatterns, isLoading: isPatternsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS.USAGE_PATTERNS, selectedPeriod],
    queryFn: async () => {
      const response = await api.get(`/analytics/usage-patterns?days=${selectedPeriod === 'today' ? 1 : selectedPeriod === 'week' ? 7 : 30}`);
      return response.data.data;
    },
  });

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS.SUMMARY, selectedPeriod],
    queryFn: async () => {
      const response = await api.get(`/analytics/summary?period=${selectedPeriod}`);
      return response.data.data;
    },
  });

  // Colors for charts
  const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  if (isDashboardLoading && !dashboardData) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
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
            <BarChart3 className="h-8 w-8 text-purple-500" />
            Analytics
          </h1>
          <p className="text-gray-400 mt-1">
            Métricas y estadísticas de tu plataforma WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            {(['today', 'week', 'month'] as Period[]).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period === 'today' && 'Hoy'}
                {period === 'week' && 'Semana'}
                {period === 'month' && 'Mes'}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => refetchDashboard()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Mensajes Totales
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(dashboardData?.realtime?.messagesssentToday + dashboardData?.realtime?.messagesReceivedToday || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {dashboardData?.realtime?.failedMessagesToday > 0 ? (
                <span className="text-red-400">
                  {dashboardData.realtime.failedMessagesToday} fallidos
                </span>
              ) : (
                <span className="text-green-400">Sin errores</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Conversaciones Activas
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(dashboardData?.realtime?.activeConversations || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {dashboardData?.conversations?.total || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Tiempo de Respuesta
            </CardTitle>
            <Timer className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.performance?.averageResponseTime || 0}s
            </div>
            <p className="text-xs text-gray-500">
              Promedio
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Uptime
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatPercentage(dashboardData?.performance?.uptime || 0, 1)}
            </div>
            <p className="text-xs text-gray-500">
              Disponibilidad
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Over Time */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Mensajes por Día</CardTitle>
            <CardDescription>
              Enviados vs Recibidos en los últimos {selectedPeriod === 'today' ? '24 horas' : selectedPeriod === 'week' ? '7 días' : '30 días'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={Object.entries(dashboardData?.messages?.byDate || {}).map(([date, data]: [string, any]) => ({
                date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
                enviados: data.sent || 0,
                recibidos: data.received || 0,
                fallidos: data.failed || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="enviados" 
                  stackId="1" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="recibidos" 
                  stackId="1" 
                  stroke="#06B6D4" 
                  fill="#06B6D4" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="fallidos" 
                  stackId="1" 
                  stroke="#EF4444" 
                  fill="#EF4444" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage Patterns */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Patrones de Uso por Hora</CardTitle>
            <CardDescription>
              Actividad durante el día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usagePatterns?.hourly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9CA3AF"
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => `${value}:00`}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Instance Status & Weekly Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instance Status */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Estado de Instancias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData?.instances?.map((instance: any, index: number) => (
              <div key={instance.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={instance.status === 'connected' ? 'connected' : 'disconnected'}
                  >
                    {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                  <span className="text-sm">{instance.name}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {instance.uptime ? `${instance.uptime.toFixed(1)}h` : 'N/A'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Pattern */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Actividad Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={usagePatterns?.daily || []}>
                <XAxis 
                  dataKey="day" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#06B6D4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usagePatterns?.recommendation && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400">
                  {usagePatterns.recommendation}
                </p>
              </div>
            )}
            
            {summary?.recommendations && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-sm text-purple-400">
                  {summary.recommendations}
                </p>
              </div>
            )}

            {dashboardData?.performance?.uptime < 99 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">
                      Uptime Bajo
                    </p>
                    <p className="text-xs text-red-300">
                      Revisa la estabilidad de tus instancias
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(dashboardData?.realtime?.failedMessagesToday || 0) > 10 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">
                      Mensajes Fallidos
                    </p>
                    <p className="text-xs text-yellow-300">
                      {dashboardData.realtime.failedMessagesToday} mensajes han fallado hoy
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {summary && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Resumen del Período</CardTitle>
            <CardDescription>
              KPIs principales para {selectedPeriod === 'today' ? 'hoy' : selectedPeriod === 'week' ? 'esta semana' : 'este mes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {formatNumber(summary.kpis?.totalMessages || 0)}
                </div>
                <p className="text-xs text-gray-400">Mensajes Totales</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {formatNumber(summary.kpis?.activeConversations || 0)}
                </div>
                <p className="text-xs text-gray-400">Conversaciones</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {formatNumber(summary.kpis?.connectedInstances || 0)}
                </div>
                <p className="text-xs text-gray-400">Instancias</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {summary.kpis?.avgResponseTime || 0}s
                </div>
                <p className="text-xs text-gray-400">Tiempo Resp.</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {formatPercentage(summary.kpis?.uptime || 0)}
                </div>
                <p className="text-xs text-gray-400">Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}