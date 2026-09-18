# BarberFlow

Sistema interno de gestão de barbearia em um monorepositório npm workspaces.

## Arquitetura

| Pasta | Responsabilidade |
| --- | --- |
| `apps/web` | Next.js App Router, React, TypeScript, Tailwind CSS, Recharts e interface responsiva |
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

### Windows sem Docker

Execute `npm run db:local:setup` para gerar credenciais locais em `apps/api/.env` (a senha inicial é exibida uma vez). Inicie o PostgreSQL real com `npm run db:local` e deixe esse terminal aberto. Em outro terminal, execute `npm run db:migrate`, `npm run db:seed` e `npm run dev`. Os arquivos de dados ficam em `.local-data/postgres` e não são versionados.

O seed cria a conta administradora e três serviços básicos. Execute-o depois da migração. O cadastro de barbeiros é restrito ao administrador.

## Segurança e regras

- Senhas com bcrypt; sessão JWT de 12 horas em cookie HTTP-only.
- Validação com Zod, limite de tentativas no login, Helmet e CORS restrito.
- A API restringe agenda e rendimentos do barbeiro ao próprio usuário. Todas as rotas financeiras globais e de exportação exigem `ADMIN`.
- Serviços e barbeiros são desativados em vez de apagar seu histórico.
- Um horário conflitante para o mesmo barbeiro retorna HTTP 409. Um bloqueio transacional por barbeiro evita conflitos em solicitações simultâneas.
- Preço e taxa de comissão são registrados no agendamento para preservar o histórico. Dados anteriores à migração usam os valores atuais como alternativa.
- O caixa considera serviços concluídos e mensalidades pagas. Atendimentos cobertos por assinatura geram produção e comissão, sem duplicar a receita recebida.
- Planos de assinatura definem serviços incluídos e limite mensal de visitas. O agendamento valida mensalidade paga, serviço, cliente e saldo de visitas.

## Rotas

Interface: `/login`, `/agenda`, `/servicos`, `/barbeiros`, `/assinaturas`, `/financeiro`, `/cadastro`.

API: `/auth/login`, `/auth/logout`, `/auth/me`, `/users`, `/services`, `/clients`, `/appointments`, `/subscription-plans`, `/subscriptions`, `/subscription-payments/:id/pay`, `/earnings/me`, `/finance`, `/finance/dashboard`, `/finance/export.csv` e `/health`.

O painel `/financeiro` mostra faturamento do dia, semana e mês, ticket médio, atendimentos concluídos, série diária, distribuição por serviço e comissões por barbeiro. Há filtros de semana, últimos 15 dias, mês e intervalo personalizado. A exportação CSV contém atendimentos e mensalidades do período.

Para verificar o fluxo de assinaturas, a autorização do financeiro e a exportação, execute `npm run test:subscriptions --workspace apps/api` com API e banco iniciados. O teste cria registros temporários e os remove ao final.

## Atualização da agenda

A agenda é atualizada automaticamente a cada 15 segundos.
