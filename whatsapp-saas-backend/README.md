# 🚀 WhatsApp SaaS Backend API Documentation

Sistema multi-tenant de WhatsApp Business con IA integrada - Backend API completo para SaaS 2025.

## 📋 Tabla de Contenidos

- [Inicio Rápido](#-inicio-rápido)
- [Autenticación](#-autenticación)
- [Endpoints](#-endpoints)
  - [Auth](#auth-endpoints)
  - [Tenant](#tenant-endpoints)
  - [WhatsApp](#whatsapp-endpoints)
  - [AI](#ai-endpoints)
  - [Analytics](#analytics-endpoints)
  - [Health](#health-endpoints)
- [WebSockets](#-websockets)
- [Webhooks](#-webhooks)
- [Rate Limits](#-rate-limits)
- [Códigos de Error](#-códigos-de-error)

## 🚀 Inicio Rápido

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.tudominio.com/api/v1
```

### Documentación Interactiva
```
Swagger UI: http://localhost:3000/api-docs
```

### Headers Requeridos
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

## 🔐 Autenticación

Todos los endpoints (excepto auth y health) requieren JWT token.

### Flujo de Autenticación
1. Registrar usuario → Obtener tokens
2. Login → Obtener tokens  
3. Usar `accessToken` en header Authorization
4. Refrescar token cuando expire

## 📡 ENDPOINTS

### AUTH ENDPOINTS

#### `POST /auth/register`
Crear nueva cuenta y organización.

**Request:**
```json
{
  "email": "admin@empresa.com",
  "password": "SecurePass123",
  "name": "Juan Pérez",
  "organizationName": "Mi Empresa SAS"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJ...",
    "refreshToken": "eyJhbGciOiJ..."
  }
}
```

---

#### `POST /auth/login`
Iniciar sesión.

**Request:**
```json
{
  "email": "admin@empresa.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJ...",
    "refreshToken": "eyJhbGciOiJ..."
  }
}
```

---

#### `POST /auth/refresh`
Renovar access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJ..."
}
```

---

#### `GET /auth/me`
Obtener perfil del usuario actual.

**Response:**
```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "admin@empresa.com",
    "name": "Juan Pérez",
    "role": "admin",
    "tenantId": "uuid",
    "tenant": {
      "id": "uuid",
      "name": "Mi Empresa SAS",
      "plan": "pro",
      "status": "active"
    }
  }
}
```

### TENANT ENDPOINTS

#### `GET /tenant`
Información del tenant actual.

**Response:**
```json
{
  "message": "Tenant retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Mi Empresa SAS",
    "plan": "pro",
    "status": "active",
    "settings": {},
    "limits": {
      "maxUsers": 20,
      "maxInstances": 5,
      "maxMessages": 20000,
      "maxConversations": 1000
    }
  }
}
```

---

#### `PUT /tenant`
Actualizar información del tenant.

**Request:**
```json
{
  "name": "Nuevo Nombre SAS",
  "settings": {
    "timezone": "America/Lima",
    "language": "es"
  }
}
```

---

#### `GET /tenant/usage`
Estadísticas de uso actuales vs límites.

**Response:**
```json
{
  "message": "Usage stats retrieved successfully",
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "Mi Empresa SAS",
      "plan": "pro"
    },
    "usage": {
      "users": {
        "current": 3,
        "limit": 20,
        "percentage": 15
      },
      "instances": {
        "current": 2,
        "limit": 5,
        "percentage": 40
      },
      "messages": {
        "current": 5420,
        "limit": 20000,
        "percentage": 27
      }
    },
    "period": {
      "start": "2025-05-01T00:00:00Z",
      "end": "2025-05-31T23:59:59Z"
    }
  }
}
```

---

#### `GET /tenant/users`
Listar usuarios del tenant.

**Response:**
```json
{
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "email": "admin@empresa.com",
      "name": "Juan Pérez",
      "role": "admin",
      "isActive": true,
      "lastLoginAt": "2025-05-26T10:30:00Z"
    }
  ]
}
```

---

#### `GET /tenant/dashboard`
Métricas para dashboard principal.

**Response:**
```json
{
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "overview": {
      "totalUsers": 3,
      "totalInstances": 2,
      "connectedInstances": 1,
      "totalMessages": 5420,
      "activeConversations": 127
    },
    "messageChart": [
      {
        "date": "2025-05-26",
        "count": 234,
        "direction": "inbound"
      }
    ]
  }
}
```

### WHATSAPP ENDPOINTS

#### `POST /whatsapp/instances`
Crear nueva instancia de WhatsApp.

**Request:**
```json
{
  "name": "Ventas WhatsApp",
  "settings": {
    "welcomeMessage": "Hola, bienvenido a nuestra empresa",
    "businessHours": "Lun-Vie 9:00-18:00"
  }
}
```

**Response:**
```json
{
  "message": "Instancia creada exitosamente",
  "data": {
    "id": "uuid",
    "name": "Ventas WhatsApp",
    "instanceKey": "d30cdb80_9463468d",
    "status": "disconnected",
    "phoneNumber": null,
    "qrCode": null,
    "settings": {}
  }
}
```

---

#### `GET /whatsapp/instances`
Listar todas las instancias.

**Response:**
```json
{
  "message": "Instancias obtenidas exitosamente",
  "data": [
    {
      "id": "uuid",
      "name": "Ventas WhatsApp",
      "instanceKey": "d30cdb80_9463468d",
      "status": "connected",
      "phoneNumber": "51999123456",
      "lastConnectionAt": "2025-05-26T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

#### `GET /whatsapp/instances/:instanceId`
Obtener detalle de instancia específica.

---

#### `POST /whatsapp/instances/:instanceId/connect`
Conectar instancia (obtener QR).

**Response:**
```json
{
  "message": "Código QR generado exitosamente",
  "data": {
    "instance": {
      "id": "uuid",
      "status": "connecting"
    },
    "qrCode": "data:image/png;base64,...",
    "connected": false
  }
}
```

---

#### `GET /whatsapp/instances/:instanceId/connection-status`
Estado de conexión en tiempo real.

**Response:**
```json
{
  "message": "Estado de conexión obtenido",
  "data": {
    "instanceId": "uuid",
    "name": "Ventas WhatsApp",
    "status": "connected",
    "connected": true,
    "phoneNumber": "51999123456",
    "profilePictureUrl": "https://...",
    "lastConnectionAt": "2025-05-26T10:00:00Z"
  }
}
```

---

#### `POST /whatsapp/instances/:instanceId/disconnect`
Desconectar instancia.

---

#### `DELETE /whatsapp/instances/:instanceId`
Eliminar instancia.

---

#### `POST /whatsapp/instances/:instanceId/messages/send`
Enviar mensaje individual.

**Request:**
```json
{
  "to": "51999888777",
  "text": "Hola! Este es un mensaje de prueba"
}
```

**Response:**
```json
{
  "message": "Mensaje agregado a la cola de envío",
  "data": {
    "message": {
      "id": "uuid",
      "content": "Hola! Este es un mensaje de prueba",
      "type": "text",
      "direction": "outbound",
      "status": "pending"
    },
    "conversation": {
      "id": "uuid",
      "contactNumber": "51999888777",
      "contactName": "Cliente"
    },
    "job": {
      "id": "job-123",
      "status": "queued"
    }
  }
}
```

---

#### `POST /whatsapp/instances/:instanceId/messages/bulk`
Enviar mensajes masivos.

**Request:**
```json
{
  "recipients": ["51999888777", "51999888778", "51999888779"],
  "text": "Promoción especial solo por hoy!",
  "delayBetweenMessages": 3000
}
```

**Response:**
```json
{
  "message": "Mensajes masivos agregados a la cola",
  "data": {
    "totalQueued": 3,
    "estimatedTime": 9,
    "jobs": ["job-124", "job-125", "job-126"]
  }
}
```

---

#### `POST /whatsapp/instances/:instanceId/messages/schedule`
Programar mensaje futuro.

**Request:**
```json
{
  "to": "51999888777",
  "text": "Recordatorio: Tienes cita mañana a las 10am",
  "sendAt": "2025-05-27T14:00:00Z"
}
```

---

#### `GET /whatsapp/instances/:instanceId/conversations`
Listar conversaciones de una instancia.

**Query params:**
- `status`: active, archived, closed

**Response:**
```json
{
  "message": "Conversaciones obtenidas exitosamente",
  "data": [
    {
      "id": "uuid",
      "contactNumber": "51999888777",
      "contactName": "Juan Cliente",
      "status": "active",
      "unreadCount": 3,
      "lastMessageAt": "2025-05-26T15:30:00Z"
    }
  ],
  "total": 45
}
```

---

#### `GET /whatsapp/conversations/:conversationId/messages`
Obtener mensajes de una conversación.

**Query params:**
- `limit`: 50 (default)
- `offset`: 0 (default)

**Response:**
```json
{
  "message": "Mensajes obtenidos exitosamente",
  "data": [
    {
      "id": "uuid",
      "content": "Hola, necesito información",
      "type": "text",
      "direction": "inbound",
      "status": "delivered",
      "createdAt": "2025-05-26T15:20:00Z"
    },
    {
      "id": "uuid",
      "content": "¡Hola! Claro, ¿en qué puedo ayudarte?",
      "type": "text",
      "direction": "outbound",
      "status": "read",
      "aiContext": {
        "generatedByAI": true,
        "model": "gpt-3.5-turbo"
      },
      "createdAt": "2025-05-26T15:20:30Z"
    }
  ],
  "total": 23
}
```

---

#### `GET /whatsapp/queue/stats`
Estadísticas de la cola de mensajes.

**Response:**
```json
{
  "message": "Estadísticas de la cola obtenidas",
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 1523,
    "failed": 7,
    "delayed": 0,
    "paused": false,
    "total": 7
  }
}
```

---

#### `GET /whatsapp/rate-limit/usage`
Uso actual de rate limits.

**Response:**
```json
{
  "message": "Uso actual de límites",
  "data": {
    "usage": {
      "minute": 15,
      "hour": 234,
      "day": 3420,
      "month": 45320
    },
    "limits": {
      "minute": 60,
      "hour": 2000,
      "day": 20000,
      "month": 200000
    },
    "percentages": {
      "minute": 25,
      "hour": 11.7,
      "day": 17.1,
      "month": 22.7
    }
  }
}
```

---

#### `POST /whatsapp/queue/retry-failed`
Reintentar mensajes fallidos.

### AI ENDPOINTS

#### `GET /ai/config`
Configuración actual de IA.

**Response:**
```json
{
  "id": "uuid",
  "enabled": true,
  "model": "gpt-3.5-turbo",
  "personality": "friendly",
  "responseMode": "always",
  "systemPrompt": "Eres un asistente virtual...",
  "welcomeMessage": "¡Hola! ¿En qué puedo ayudarte?",
  "businessHours": {
    "monday": { "start": "09:00", "end": "18:00" },
    "timezone": "America/Lima"
  },
  "keywords": ["ayuda", "info", "precio"],
  "settings": {
    "temperature": 0.7,
    "maxTokens": 150,
    "responseDelay": 1500,
    "contextWindow": 5,
    "language": "es"
  },
  "limits": {
    "maxTokensPerDay": 10000,
    "maxTokensPerMonth": 100000
  },
  "usage": {
    "tokensToday": 2340,
    "tokensThisMonth": 45320
  }
}
```

---

#### `PUT /ai/config`
Actualizar configuración de IA.

**Request:**
```json
{
  "personality": "professional",
  "systemPrompt": "Eres un asistente profesional...",
  "settings": {
    "temperature": 0.5,
    "maxTokens": 200
  },
  "keywords": ["consulta", "servicio", "cotización"]
}
```

---

#### `POST /ai/toggle`
Activar/desactivar IA rápidamente.

**Request:**
```json
{
  "enabled": true
}
```

---

#### `GET /ai/stats`
Estadísticas de uso de IA.

**Query params:**
- `period`: today, week, month

**Response:**
```json
{
  "period": {
    "start": "2025-05-20T00:00:00Z",
    "end": "2025-05-26T23:59:59Z",
    "days": 7
  },
  "messages": {
    "total": 1523,
    "handledByAI": 1245,
    "handledByHuman": 278,
    "aiResponseRate": 81.7
  },
  "performance": {
    "averageResponseTime": 1.2,
    "successRate": 95,
    "tokensUsed": 45320,
    "estimatedCost": 0.91
  },
  "topIntents": [
    {
      "intent": "QUESTION_PRODUCT",
      "count": 498,
      "percentage": 40
    }
  ],
  "value": {
    "timeSaved": 2490,
    "conversationsAutomated": 415,
    "customerSatisfaction": 92
  }
}
```

---

#### `POST /ai/test`
Probar respuesta de IA.

**Request:**
```json
{
  "message": "¿Cuáles son sus horarios de atención?",
  "context": ["Hola", "Hola, ¿en qué puedo ayudarte?"]
}
```

**Response:**
```json
{
  "response": "Nuestros horarios de atención son de Lunes a Viernes de 9:00 a 18:00 y Sábados de 9:00 a 13:00. ¿Hay algo más en lo que pueda ayudarte?",
  "metadata": {
    "model": "gpt-3.5-turbo",
    "tokensUsed": 45,
    "processingTime": 823,
    "temperature": 0.7
  }
}
```

---

#### `GET /ai/templates`
Plantillas por industria disponibles.

**Response:**
```json
[
  {
    "industry": "ecommerce",
    "config": {
      "systemPrompt": "Eres un asistente de tienda online...",
      "personality": "sales",
      "settings": {
        "temperature": 0.7
      }
    }
  },
  {
    "industry": "restaurant",
    "config": {
      "systemPrompt": "Eres el asistente de un restaurante...",
      "personality": "friendly"
    }
  }
]
```

---

#### `POST /ai/templates/apply`
Aplicar plantilla de industria.

**Request:**
```json
{
  "industry": "ecommerce"
}
```

---

#### `GET /ai/custom-responses`
Obtener respuestas personalizadas.

---

#### `PUT /ai/custom-responses`
Actualizar respuestas personalizadas.

**Request:**
```json
{
  "hola": "¡Hola! Bienvenido a TechStore 🎉",
  "precio": "Los precios varían según el producto. ¿Cuál te interesa?",
  "gracias": "¡De nada! Estamos aquí para ayudarte 😊"
}
```

---

#### `GET /ai/health`
Estado del servicio de IA.

---

#### `POST /ai/reset-usage`
Resetear contadores de uso.

### ANALYTICS ENDPOINTS

#### `GET /analytics/dashboard`
Métricas principales del dashboard.

**Query params:**
- `period`: today, week, month

**Response:**
```json
{
  "message": "Métricas del dashboard obtenidas exitosamente",
  "data": {
    "realtime": {
      "messagessentToday": 234,
      "messagesReceivedToday": 456,
      "failedMessagesToday": 2,
      "activeConversations": 67
    },
    "messages": {
      "total": 690,
      "byDate": {
        "2025-05-26": {
          "sent": 234,
          "received": 456,
          "failed": 2
        }
      }
    },
    "conversations": {
      "total": 145,
      "active": 67,
      "archived": 70,
      "closed": 8
    },
    "instances": [
      {
        "id": "uuid",
        "name": "Ventas",
        "status": "connected",
        "uptime": 156.5
      }
    ],
    "performance": {
      "averageResponseTime": 1.2,
      "uptime": 99.9
    }
  }
}
```

---

#### `GET /analytics/usage-patterns`
Análisis de patrones de uso.

**Query params:**
- `days`: 30 (default)

**Response:**
```json
{
  "message": "Patrones de uso analizados exitosamente",
  "data": {
    "hourly": [
      { "hour": 9, "count": 234 },
      { "hour": 10, "count": 345 }
    ],
    "daily": [
      { "day": "Lunes", "count": 1234 },
      { "day": "Martes", "count": 1345 }
    ],
    "peakHours": [10, 11, 15],
    "recommendation": "Tus horas pico son 10h, 11h, 15h. El día con más actividad es Martes."
  }
}
```

---

#### `GET /analytics/report`
Generar reporte detallado.

**Query params:**
- `startDate`: 2025-05-01
- `endDate`: 2025-05-31
- `format`: json, csv

---

#### `POST /analytics/events`
Registrar evento personalizado.

**Request:**
```json
{
  "type": "custom_action",
  "instanceId": "uuid",
  "metadata": {
    "action": "product_viewed",
    "productId": "ABC123"
  }
}
```

---

#### `GET /analytics/summary`
Resumen ejecutivo con KPIs.

**Query params:**
- `period`: today, week, month

**Response:**
```json
{
  "message": "Resumen ejecutivo generado",
  "data": {
    "period": "week",
    "kpis": {
      "totalMessages": 4830,
      "activeConversations": 67,
      "connectedInstances": 2,
      "avgResponseTime": 1.2,
      "uptime": 99.9
    },
    "trends": {
      "messageGrowth": 23,
      "peakHours": [10, 11, 15],
      "mostActiveDay": "Martes"
    },
    "recommendations": "Considera agregar más agentes en horario pico",
    "lastUpdated": "2025-05-26T20:00:00Z"
  }
}
```

---

#### `GET /analytics/realtime`
Métricas en tiempo real.

### HEALTH ENDPOINTS

#### `GET /` (público)
Información básica de la API.

**Response:**
```json
{
  "name": "WhatsApp SaaS API",
  "version": "1.0.0",
  "description": "Multi-tenant WhatsApp Business API with AI",
  "documentation": "/api-docs",
  "health": "/health",
  "timestamp": "2025-05-26T20:00:00Z"
}
```

---

#### `GET /health` (público)
Estado de todos los servicios.

**Response:**
```json
{
  "statusCode": 200,
  "status": "ok",
  "timestamp": "2025-05-26T20:00:00Z",
  "services": {
    "api": "ok",
    "database": "ok",
    "redis": "ok",
    "evolution": "ok",
    "openai": "ok"
  },
  "details": {
    "database": { "connected": true },
    "redis": { "connected": true },
    "evolution": { "connected": true, "instances": 2 },
    "openai": { "configured": true }
  }
}
```

## 🔄 WebSockets

Para actualizaciones en tiempo real (próximamente).

```javascript
// Frontend example
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('message:new', (data) => {
  console.log('Nuevo mensaje:', data);
});

socket.on('instance:status', (data) => {
  console.log('Cambio de estado:', data);
});
```

## 🪝 Webhooks

### Webhooks Entrantes (de Evolution API)

Tu backend recibe eventos en:
```
POST /api/v1/whatsapp/webhook/:instanceId
POST /api/v1/whatsapp/webhook/:instanceId/:eventType
```

### Webhooks Salientes (próximamente)

Configurables por tenant para recibir eventos.

## ⚡ Rate Limits

### Por Plan

| Plan | Por Minuto | Por Hora | Por Día | Por Mes |
|------|------------|----------|---------|---------|
| Basic | 20 | 500 | 5,000 | 50,000 |
| Pro | 60 | 2,000 | 20,000 | 200,000 |
| Enterprise | 200 | 10,000 | 100,000 | 1,000,000 |

### Headers de Rate Limit

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1685628000
```

## 🚨 Códigos de Error

| Código | Significado |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validación falló |
| 401 | Unauthorized - Token inválido |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found |
| 409 | Conflict - Recurso duplicado |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Formato de Error

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email inválido"
    }
  ]
}
```

## 🛠️ SDKs y Ejemplos

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Enviar mensaje
const sendMessage = async (instanceId: string, to: string, text: string) => {
  const response = await api.post(`/whatsapp/instances/${instanceId}/messages/send`, {
    to,
    text
  });
  return response.data;
};
```

### React Hook Example
```typescript
const useWhatsAppInstances = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: () => api.get('/whatsapp/instances').then(res => res.data)
  });
  
  return { instances: data?.data || [], isLoading, error };
};
```

## 📞 Soporte

- **Email**: soporte@tudominio.com
- **Documentación**: https://docs.tudominio.com
- **Status Page**: https://status.tudominio.com

---

**Última actualización**: Mayo 26, 2025 - v1.0.0