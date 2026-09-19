# Arquitetura do sistema

## Visão de contexto

```mermaid
flowchart LR
    Admin[Administrador]
    Barber[Barbeiro]
    System[BarberFlow]
    WhatsApp[WhatsApp Cloud API]
    Admin -->|gerencia operação e finanças| System
    Barber -->|opera agenda e consulta produção| System
    System -->|envia lembretes opcionais| WhatsApp
```

## Contêineres

```mermaid
flowchart LR
    Browser[Navegador]
    Web[Next.js App Router<br/>React + Tailwind + Recharts]
    API[Express API<br/>TypeScript + Zod + JWT]
    DB[(PostgreSQL)]
    Provider[WhatsApp Cloud API]
    Browser -->|HTTPS| Web
    Web -->|REST + cookie JWT| API
    Web <-->|SSE /events| API
    API -->|Prisma ORM| DB
    API -->|HTTPS opcional| Provider
```

## Componentes do backend

```mermaid
flowchart TB
    Server[server.ts<br/>composição e infraestrutura]
    Core[core<br/>auth, database, errors, schemas, events]
    Auth[auth]
    Users[users]
    Catalog[catalog]
    Appointments[appointments]
    Subscriptions[subscriptions]
    Finance[finance]
    Operations[operations]
    Prisma[Prisma Client]
    Server --> Core
    Server --> Auth
    Server --> Users
    Server --> Catalog
    Server --> Appointments
    Server --> Subscriptions
    Server --> Finance
    Server --> Operations
    Auth --> Prisma
    Users --> Prisma
    Catalog --> Prisma
    Appointments --> Prisma
    Subscriptions --> Prisma
    Finance --> Prisma
    Operations --> Prisma
```

Cada módulo pode conter:

- **Routes:** define URI, verbo HTTP e cadeia de middlewares.
- **Controller:** traduz HTTP para chamadas da aplicação.
- **Service:** concentra validações e regras de negócio.
- **Repository:** encapsula o acesso persistente.
- **Provider:** integra serviços externos, como WhatsApp.

## Estrutura do monorepo

```text
BarberFlow/
├── apps/
│   ├── api/
│   │   ├── prisma/          # schema, migrations e seed
│   │   ├── src/core/        # infraestrutura compartilhada
│   │   ├── src/modules/     # módulos de domínio
│   │   └── tests/           # testes integrados
│   └── web/
│       ├── app/             # rotas do Next.js App Router
│       ├── components/      # módulos e componentes visuais
│       ├── e2e/             # testes Playwright
│       └── public/          # ativos visuais
├── docs/                    # documentação do produto
├── scripts/                 # PostgreSQL local no Windows
└── .github/workflows/       # integração contínua
```

## Fluxo de uma requisição

1. O navegador envia a requisição com `credentials: include`.
2. Middlewares aplicam headers de segurança, CORS, origem, JSON e autenticação.
3. A rota aplica RBAC e encaminha a requisição ao controller.
4. O payload é validado com Zod.
5. O service executa regras de negócio e coordena transações.
6. O repository ou Prisma acessa o PostgreSQL.
7. Erros conhecidos são convertidos em respostas HTTP padronizadas.
8. Mudanças de agenda publicam evento SSE para os usuários autorizados.

## Implantação

```mermaid
flowchart TB
    Client[Cliente web]
    Frontend[Servidor Next.js<br/>porta 3000]
    Backend[Servidor Node.js/Express<br/>porta 4000]
    Database[(PostgreSQL 16<br/>porta 5432)]
    Meta[Meta Graph API]
    Client -->|HTTP/HTTPS| Frontend
    Client -->|REST e SSE| Backend
    Backend -->|TCP + TLS em produção| Database
    Backend -.->|HTTPS se configurado| Meta
```

## Decisões arquiteturais

| Decisão | Justificativa |
| --- | --- |
| npm workspaces | Mantém frontend e backend no mesmo ciclo de versão com baixa complexidade operacional |
| REST + SSE | REST atende comandos e consultas; SSE fornece atualização unidirecional simples para a agenda |
| Prisma ORM | Schema tipado, migrations reproduzíveis e suporte a transações PostgreSQL |
| Cookie HTTP-only | Reduz exposição do token ao JavaScript do navegador |
| Snapshot financeiro | Preserva preço e comissão históricos mesmo após alterações cadastrais |
| Advisory locks | Serializa decisões concorrentes de agenda e franquia sem depender do frontend |
