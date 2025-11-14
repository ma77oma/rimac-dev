# Arquitectura del Sistema

## Arquitectura Limpia (Clean Architecture)

El proyecto está organizado siguiendo los principios de **Arquitectura Limpia**, separando las responsabilidades en capas bien definidas:

```
src/
├── domain/              # Capa de Dominio (Core)
│   ├── Appointment.ts           # Entidad de dominio
│   ├── repositories/            # Contratos de repositorios
│   └── publishers/              # Contratos de publishers
│
├── application/         # Capa de Aplicación (Use Cases)
│   ├── AppointmentService.ts   # Casos de uso
│   └── dtos/                    # Data Transfer Objects
│
├── infrastructure/      # Capa de Infraestructura (Implementaciones)
│   ├── dynamo/                  # Implementación DynamoDB
│   ├── mysql/                   # Implementación MySQL
│   ├── sns/                     # Implementación SNS
│   ├── eventbridge/             # Implementación EventBridge
│   ├── memory/                  # Implementaciones para testing
│   └── factories/               # Factory Pattern
│
└── lambdas/            # Capa de Interfaces/Adapters
    └── *.ts                     # Handlers Lambda (adaptadores)
```

## Patrones de Diseño Implementados

### 1. Factory Pattern

**Ubicación**: `src/infrastructure/factories/`

**Propósito**: Centralizar la creación de instancias según el contexto (desarrollo/producción).

**Implementaciones**:
- `RepositoryFactory`: Crea repositorios (DynamoDB o In-Memory)
- `PublisherFactory`: Crea publishers de mensajes (SNS o No-Op)
- `EventPublisherFactory`: Crea publishers de eventos (EventBridge)
- `ServiceFactory`: Crea servicios de aplicación con dependencias inyectadas

**Ejemplo de uso**:
```typescript
// En lugar de crear instancias directamente:
const repo = isOffline ? new InMemoryAppointmentRepository() : new DynamoAppointmentRepository();

// Usamos Factory:
const repository = RepositoryFactory.create();
```

### 2. Strategy Pattern

**Ubicación**: `src/infrastructure/factories/`

**Propósito**: Seleccionar la estrategia de persistencia/publicación según el entorno.

**Estrategias**:
- **Producción**: DynamoDB + SNS + EventBridge
- **Desarrollo/Testing**: In-Memory + No-Op

**Implementación**:
```typescript
static create(): IAppointmentRepository {
  const useInMemory = process.env.USE_IN_MEMORY === "true" || process.env.IS_OFFLINE === "true";
  
  if (useInMemory) {
    return new InMemoryAppointmentRepository(); // Estrategia para testing
  }
  
  return new DynamoAppointmentRepository(); // Estrategia para producción
}
```

### 3. Dependency Injection

**Ubicación**: `src/application/AppointmentService.ts`

**Propósito**: Invertir dependencias, el servicio depende de interfaces, no de implementaciones.

**Implementación**:
```typescript
export class AppointmentService {
  constructor(
    private repository: IAppointmentRepository,      // Interface, no implementación
    private messagePublisher: IMessagePublisher      // Interface, no implementación
  ) {}
}
```

## Capas de la Arquitectura

### Domain Layer (Capa de Dominio)

**Responsabilidad**: Contiene la lógica de negocio pura, entidades y contratos.

**Componentes**:
- `Appointment.ts`: Entidad de dominio
- `repositories/IAppointmentRepository.ts`: Contrato para persistencia
- `publishers/IMessagePublisher.ts`: Contrato para publicación de mensajes
- `publishers/IEventPublisher.ts`: Contrato para publicación de eventos

**Principio**: No depende de ninguna otra capa.

### Application Layer (Capa de Aplicación)

**Responsabilidad**: Implementa los casos de uso y orquesta la lógica de negocio.

**Componentes**:
- `AppointmentService.ts`: Casos de uso (create, listByInsured, markAsCompleted)
- `dtos/`: Data Transfer Objects para comunicación entre capas

**Principio**: Depende solo de Domain Layer.

### Infrastructure Layer (Capa de Infraestructura)

**Responsabilidad**: Implementaciones concretas de las interfaces definidas en Domain.

**Componentes**:
- `dynamo/`: Implementación con DynamoDB
- `mysql/`: Implementación con MySQL
- `sns/`: Implementación con AWS SNS
- `eventbridge/`: Implementación con AWS EventBridge
- `memory/`: Implementaciones para testing
- `factories/`: Factories para crear instancias

**Principio**: Depende de Domain y Application.

### Interface/Adapter Layer (Capa de Interfaces)

**Responsabilidad**: Adaptadores que conectan el sistema con el mundo exterior (HTTP, SQS, etc.).

**Componentes**:
- `lambdas/appointment_api.ts`: Adaptador HTTP
- `lambdas/appointment_pe.ts`: Adaptador SQS para Perú
- `lambdas/appointment_cl.ts`: Adaptador SQS para Chile
- `lambdas/appointment_confirm.ts`: Adaptador SQS para confirmaciones

**Principio**: Depende de Application e Infrastructure.

## Flujo de Dependencias

```
┌─────────────────────────────────────┐
│   Interface/Adapter Layer           │  (Lambdas)
│   - appointment_api.ts              │
│   - appointment_pe.ts               │
└──────────────┬──────────────────────┘
               │ usa
               ▼
┌─────────────────────────────────────┐
│   Application Layer                 │
│   - AppointmentService              │
│   - DTOs                            │
└──────────────┬──────────────────────┘
               │ usa
               ▼
┌─────────────────────────────────────┐
│   Domain Layer                      │
│   - Appointment (Entity)            │
│   - Interfaces                      │
└─────────────────────────────────────┘
               ▲
               │ implementa
┌──────────────┴──────────────────────┐
│   Infrastructure Layer               │
│   - DynamoAppointmentRepository      │
│   - SnsPublisher                     │
│   - Factories                        │
└─────────────────────────────────────┘
```

## Beneficios de esta Arquitectura

1. **Testabilidad**: Fácil de testear usando implementaciones in-memory
2. **Mantenibilidad**: Cambios en infraestructura no afectan la lógica de negocio
3. **Escalabilidad**: Fácil agregar nuevas implementaciones (ej: MongoDB, Kafka)
4. **Desacoplamiento**: Las capas están desacopladas mediante interfaces
5. **Claridad**: Cada capa tiene una responsabilidad bien definida

## Ejemplo de Extensión

Para agregar un nuevo repositorio (ej: MongoDB):

1. **Domain**: La interfaz `IAppointmentRepository` ya existe
2. **Infrastructure**: Crear `MongoAppointmentRepository` que implementa la interfaz
3. **Factory**: Actualizar `RepositoryFactory` para incluir la nueva opción
4. **Application**: No requiere cambios, usa la interfaz

## Convenciones

- **Interfaces**: Prefijo `I` (ej: `IAppointmentRepository`)
- **DTOs**: Sufijo `Request`/`Response` (ej: `CreateAppointmentRequest`)
- **Factories**: Sufijo `Factory` (ej: `RepositoryFactory`)
- **Repositories**: Sufijo `Repository` (ej: `DynamoAppointmentRepository`)
- **Publishers**: Sufijo `Publisher` (ej: `SnsPublisher`)

