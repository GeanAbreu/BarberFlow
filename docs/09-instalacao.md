# Instalação e execução

## Pré-requisitos

- Node.js 20.9 ou superior.
- npm.
- PostgreSQL 16 ou Docker.
- Chromium instalado pelo Playwright para os testes E2E.

## Instalação com Docker

```bash
git clone https://github.com/GeanAbreu/BarberFlow.git
cd BarberFlow
npm install
cp .env.example apps/api/.env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

A aplicação estará em `http://localhost:3000` e a API em `http://localhost:4000`.

## Windows sem Docker

```powershell
npm install
npm run db:local:setup
npm run db:migrate
npm run db:seed
npm run dev:local
```

O setup local mantém o banco em `.local-data/postgres`, fora do versionamento.

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL utilizada pelo Prisma |
| `JWT_SECRET` | Segredo JWT com no mínimo 32 caracteres |
| `WEB_ORIGIN` | Origem autorizada pelo CORS |
| `PORT` | Porta da API, padrão `4000` |
| `SEED_ADMIN_EMAIL` | E-mail do administrador criado pelo seed |
| `SEED_ADMIN_PASSWORD` | Senha inicial do administrador |
| `NEXT_PUBLIC_API_URL` | URL da API usada pelo frontend |
| `WHATSAPP_ACCESS_TOKEN` | Token opcional da WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Identificador opcional do remetente WhatsApp |

## Scripts do monorepo

| Comando | Ação |
| --- | --- |
| `npm run dev` | Inicia frontend e API em desenvolvimento |
| `npm run dev:local` | Inicia banco local, frontend e API |
| `npm run build` | Gera Prisma Client e builds de produção |
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:migrate` | Cria ou aplica migration de desenvolvimento |
| `npm run db:seed` | Cria administrador e dados iniciais |
| `npm run db:local:setup` | Prepara PostgreSQL embarcado no Windows |
| `npm test` | Executa testes integrados da API |
| `npm run test:e2e` | Executa testes de interface |

## Primeiro acesso

Use os valores definidos em `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`. Troque a senha de exemplo antes de implantar o sistema em qualquer ambiente acessível externamente.
