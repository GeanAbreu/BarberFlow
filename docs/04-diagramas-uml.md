# Diagramas UML

## Casos de uso

```mermaid
flowchart LR
    Admin((Administrador))
    Barber((Barbeiro))
    Auth[Autenticar-se]
    Agenda[Gerenciar agenda]
    OwnAgenda[Consultar própria agenda]
    Catalog[Gerenciar serviços e clientes]
    Team[Gerenciar equipe]
    Plans[Gerenciar assinaturas]
    Finance[Consultar financeiro global]
    OwnIncome[Consultar rendimentos próprios]
    Cash[Registrar despesas e fechar caixa]
    Blocks[Gerenciar bloqueios]
    History[Consultar histórico do cliente]
    Reminders[Processar lembretes]
    Admin --> Auth
    Admin --> Agenda
    Admin --> Catalog
    Admin --> Team
    Admin --> Plans
    Admin --> Finance
    Admin --> Cash
    Admin --> Blocks
    Admin --> History
    Admin --> Reminders
    Barber --> Auth
    Barber --> OwnAgenda
    Barber --> OwnIncome
```

## Diagrama de classes do domínio

```mermaid
classDiagram
    class User {
      +UUID id
      +String name
      +String email
      +Role role
      +Decimal commission
      +String workStart
      +String workEnd
      +Boolean active
    }
    class Client {
      +UUID id
      +String name
      +String phone
      +String notes
    }
    class Service {
      +UUID id
      +String name
      +Int duration
      +Decimal price
      +Boolean active
    }
    class Appointment {
      +UUID id
      +DateTime date
      +AppointmentStatus status
      +Decimal priceAtBooking
      +Decimal commissionAtBooking
      +PaymentMethod paymentMethod
    }
    class SubscriptionPlan {
      +UUID id
      +String name
      +Decimal price
      +Int visitsPerMonth
      +Boolean active
    }
    class ClientSubscription {
      +UUID id
      +Decimal price
      +Int visitsPerMonth
      +Int billingDay
      +SubscriptionStatus status
    }
    class SubscriptionPayment {
      +UUID id
      +String period
      +DateTime dueDate
      +Decimal amount
      +SubscriptionPaymentStatus status
    }
    class ScheduleBlock {
      +UUID id
      +DateTime start
      +DateTime end
      +String reason
    }
    class Expense {
      +UUID id
      +String description
      +String category
      +Decimal amount
      +PaymentMethod paymentMethod
    }
    class CashClosing {
      +UUID id
      +String businessDate
      +Decimal expectedAmount
      +Decimal actualAmount
      +Decimal difference
    }
    User "1" --> "0..*" Appointment : atende
    Client "1" --> "0..*" Appointment : agenda
    Service "1" --> "0..*" Appointment : define
    User "1" --> "0..*" ScheduleBlock : possui
    Client "1" --> "0..*" ClientSubscription : contrata
    SubscriptionPlan "1" --> "0..*" ClientSubscription : instancia
    ClientSubscription "1" --> "0..*" SubscriptionPayment : cobra
    ClientSubscription "0..1" --> "0..*" Appointment : cobre
    User "1" --> "0..*" Expense : registra
    User "1" --> "0..*" CashClosing : fecha
```

## Sequência de criação de agendamento

```mermaid
sequenceDiagram
    actor A as Administrador
    participant W as Next.js
    participant API as AppointmentsController
    participant S as AppointmentsService
    participant DB as PostgreSQL/Prisma
    participant SSE as EventStream
    A->>W: Informa cliente, barbeiro, serviço e horário
    W->>API: POST /appointments
    API->>S: create(input)
    S->>DB: Inicia transação e advisory lock
    S->>DB: Consulta expediente, bloqueios e conflitos
    alt horário indisponível
        DB-->>S: conflito encontrado
        S-->>API: ApiError 409
        API-->>W: conflito de agenda
    else horário disponível
        S->>DB: Cria agendamento e lembrete
        DB-->>S: agendamento persistido
        S->>SSE: publish agenda.updated
        S-->>API: agendamento
        API-->>W: 201 Created
        SSE-->>W: atualização em tempo real
    end
```

## Sequência de uso de assinatura

```mermaid
sequenceDiagram
    participant API as API
    participant S as AppointmentService
    participant DB as PostgreSQL
    API->>S: Criar atendimento com subscriptionId
    S->>DB: Bloquear assinatura na transação
    S->>DB: Validar status e mensalidade do período
    S->>DB: Validar serviço incluído
    S->>DB: Contar visitas consumidas no mês
    alt assinatura inválida ou sem saldo
        S-->>API: 409 Conflict
    else assinatura elegível
        S->>DB: Criar agendamento vinculado
        S-->>API: 201 Created
    end
```

## Fluxo operacional recomendado do atendimento

A API aceita correções administrativas de estado. O fluxo abaixo representa a sequência usada pela operação e pela interface.

```mermaid
stateDiagram-v2
    [*] --> AGENDADO
    AGENDADO --> EM_ANDAMENTO
    AGENDADO --> CANCELADO
    EM_ANDAMENTO --> CONCLUIDO
    EM_ANDAMENTO --> CANCELADO
    CONCLUIDO --> [*]
    CANCELADO --> [*]
```

## Sequência de fechamento de caixa

```mermaid
sequenceDiagram
    actor A as Administrador
    participant API as OperationsController
    participant S as OperationsService
    participant DB as PostgreSQL
    A->>API: data, fundo inicial e valor contado
    API->>S: closeCash(input, userId)
    S->>DB: Consultar serviços concluídos
    S->>DB: Consultar mensalidades pagas
    S->>DB: Consultar despesas
    S->>S: esperado = abertura + receitas - despesas
    S->>S: diferença = contado - esperado
    S->>DB: Persistir fechamento único da data
    DB-->>A: fechamento calculado
```
