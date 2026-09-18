# BarberFlow

Sistema interno de gestão de barbearia em um monorepositório npm workspaces.

## Arquitetura

| Pasta | Responsabilidade |
| --- | --- |
| `apps/web` | Next.js App Router, React, TypeScript e interface responsiva |
| `apps/api` | Express, autenticação JWT, autorização, regras de negócio e Prisma |
| `apps/api/prisma` | Schema PostgreSQL e seed inicial |

## Requisitos

- Node.js 20.9 ou superior
- PostgreSQL 16 ou Docker
- npm

## Início rápido

1. Copie `.env.example` para `apps/api/.env` e altere `JWT_SECRET` e `SEED_ADMIN_PASSWORD`. A interface usa `http://localhost:4000` por padrão; para outra API, configure `NEXT_PUBLIC_API_URL` em `apps/web/.env.local`.
2. Inicie o banco com `docker compose up -d` ou configure um PostgreSQL existente em `DATABASE_URL`.
3. Instale as dependências com `npm install`.
4. Execute `npm run db:migrate` e `npm run db:seed`.
5. Inicie a interface e a API com `npm run dev`.
6. Acesse [http://localhost:3000](http://localhost:3000) e entre com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.

O seed cria a conta administradora e três serviços básicos. Execute-o depois da migração. O cadastro de barbeiros é restrito ao administrador.

## Segurança e regras

- Senhas com bcrypt; sessão JWT de 12 horas em cookie HTTP-only.
- Validação com Zod, limite de tentativas no login, Helmet e CORS restrito.
- A API restringe agenda e rendimentos do barbeiro ao próprio usuário.
- Serviços e barbeiros são desativados em vez de apagar seu histórico.
- Um horário conflitante para o mesmo barbeiro retorna HTTP 409. Um bloqueio transacional por barbeiro evita conflitos em solicitações simultâneas.
- Valores financeiros usam apenas agendamentos concluídos. A comissão é calculada com a taxa atual cadastrada para o barbeiro.

## Rotas

Interface: `/login`, `/agenda`, `/servicos`, `/barbeiros`, `/financeiro`, `/cadastro`.

API: `/auth/login`, `/auth/logout`, `/auth/me`, `/users`, `/services`, `/clients`, `/appointments`, `/finance` e `/health`.

## Atualização da agenda

A agenda é atualizada automaticamente a cada 15 segundos.
