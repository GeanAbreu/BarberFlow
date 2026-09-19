# Modelo de dados e DER

## Diagrama entidade-relacionamento

```mermaid
erDiagram
    User {
      uuid id PK
      string name
      string email UK
      string password
      string phone
      Role role
      decimal commission
      string workStart
      string workEnd
      boolean active
    }
    Client {
      uuid id PK
      string name
      string phone
      string notes
    }
    Service {
      uuid id PK
      string name
      string description
      int duration
      decimal price
      boolean active
    }
    Appointment {
      uuid id PK
      datetime date
      AppointmentStatus status
      decimal priceAtBooking
      decimal commissionAtBooking
      PaymentMethod paymentMethod
      uuid barberId FK
      uuid clientId FK
      uuid serviceId FK
      uuid subscriptionId FK
    }
    SubscriptionPlan {
      uuid id PK
      string name
      decimal price
      int visitsPerMonth
      boolean active
    }
    ClientSubscription {
      uuid id PK
      uuid clientId FK
      uuid planId FK
      decimal price
      int visitsPerMonth
      int billingDay
      SubscriptionStatus status
    }
    SubscriptionPayment {
      uuid id PK
      uuid subscriptionId FK
      string period
      datetime dueDate
      decimal amount
      SubscriptionPaymentStatus status
      datetime paidAt
      PaymentMethod paymentMethod
    }
    ScheduleBlock {
      uuid id PK
      uuid barberId FK
      datetime start
      datetime end
      string reason
    }
    Expense {
      uuid id PK
      string description
      string category
      decimal amount
      datetime date
      PaymentMethod paymentMethod
      uuid createdById FK
    }
    CashClosing {
      uuid id PK
      string businessDate UK
      decimal openingAmount
      decimal expectedAmount
      decimal actualAmount
      decimal difference
      decimal revenue
      decimal expenses
      uuid closedById FK
    }
    AppointmentReminder {
      uuid id PK
      uuid appointmentId FK, UK
      datetime scheduledFor
      ReminderStatus status
      string destination
      string providerId
      string error
      datetime sentAt
    }
    User ||--o{ Appointment : atende
    User ||--o{ ScheduleBlock : possui
    User ||--o{ Expense : registra
    User ||--o{ CashClosing : realiza
    Client ||--o{ Appointment : possui
    Service ||--o{ Appointment : classifica
    Client ||--o{ ClientSubscription : contrata
    SubscriptionPlan ||--o{ ClientSubscription : origina
    SubscriptionPlan }o--o{ Service : inclui
    ClientSubscription }o--o{ Service : garante
    ClientSubscription ||--o{ SubscriptionPayment : fatura
    ClientSubscription o|--o{ Appointment : cobre
    Appointment ||--o| AppointmentReminder : agenda
```

## Entidades

| Entidade | Finalidade |
| --- | --- |
| `User` | Credenciais, perfil, expediente e comissão do profissional |
| `Client` | Identificação, contato, observações e relacionamentos do cliente |
| `Service` | Catálogo com duração e preço vigente |
| `Appointment` | Atendimento e snapshots financeiros utilizados nos relatórios |
| `SubscriptionPlan` | Modelo comercial reutilizável de assinatura |
| `ClientSubscription` | Contrato específico do cliente com snapshots do plano |
| `SubscriptionPayment` | Cobrança mensal e reconhecimento da receita recorrente |
| `ScheduleBlock` | Indisponibilidade do profissional em um intervalo |
| `Expense` | Saída financeira operacional |
| `CashClosing` | Consolidação imutável do caixa de uma data |
| `AppointmentReminder` | Estado de entrega do lembrete de um atendimento |

## Enums

- `Role`: `ADMIN`, `BARBEIRO`.
- `AppointmentStatus`: `AGENDADO`, `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO`.
- `SubscriptionStatus`: `ATIVA`, `PAUSADA`, `CANCELADA`.
- `SubscriptionPaymentStatus`: `PENDENTE`, `PAGO`.
- `PaymentMethod`: `DINHEIRO`, `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `OUTRO`.
- `ReminderStatus`: `PENDENTE`, `ENVIADO`, `FALHOU`, `IGNORADO`.

## Restrições e índices importantes

| Estrutura | Finalidade |
| --- | --- |
| `User.email` único | Impede credenciais duplicadas |
| `SubscriptionPayment(subscriptionId, period)` único | Impede duas mensalidades para o mesmo período |
| `CashClosing.businessDate` único | Garante um fechamento por data |
| `AppointmentReminder.appointmentId` único | Garante no máximo um lembrete por atendimento |
| `Appointment(barberId, date)` | Otimiza consultas de agenda por profissional |
| `Appointment(date, status)` | Otimiza relatórios e consultas operacionais |
| `ScheduleBlock(barberId, start, end)` | Otimiza validação de indisponibilidade |
| `SubscriptionPayment(status, dueDate)` | Otimiza acompanhamento de cobranças |

## Estratégia financeira

Campos monetários utilizam `Decimal` no PostgreSQL. `Appointment.priceAtBooking` e `commissionAtBooking` registram os valores vigentes na criação do atendimento. `ClientSubscription` preserva preço, franquia e serviços contratados, evitando que edições futuras no plano alterem contratos existentes.

O schema é evoluído exclusivamente por migrations em `apps/api/prisma/migrations`.
