# BarberFlow

> Plataforma full stack para gestão operacional e financeira de barbearias, construída em TypeScript com arquitetura monorepo.

[![CI](https://github.com/GeanAbreu/BarberFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/GeanAbreu/BarberFlow/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Apresentação

O **BarberFlow** centraliza agenda, equipe, clientes, serviços, assinaturas, pagamentos, despesas, caixa, comissões e relatórios de uma barbearia. O sistema possui experiências específicas para administradores e barbeiros, autorização aplicada na API e atualização da agenda em tempo real.

O projeto demonstra a construção de um produto de gestão completo: regras de concorrência para horários, histórico financeiro imutável, mensalidades recorrentes, cálculo de comissão, fechamento de caixa, indicadores gerenciais e integração preparada para lembretes via WhatsApp.

A interface segue uma identidade dark inspirada em barbearias vintage, com layout responsivo, tipografia própria, gráficos e elementos visuais autorais.

## Principais recursos

- Autenticação JWT e controle de acesso por perfil.
- Agenda diária em tempo real com prevenção de conflitos.
- Gestão de serviços, clientes, barbeiros e expedientes.
- Clube de assinaturas com mensalidades e franquia de visitas.
- Dashboard financeiro, comissões, despesas e fechamento diário.
- Histórico do cliente, bloqueios de agenda e lembretes.
- Exportação CSV, testes automatizados e integração contínua.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide React |
| Backend | Node.js, Express 4, TypeScript, Zod |
| Persistência | PostgreSQL 16, Prisma ORM, Prisma Migrate |
| Autenticação | JWT, cookies HTTP-only e bcrypt |
| Tempo real | Server-Sent Events |
| Segurança | Helmet, CORS, rate limiting, RBAC e validação de origem |
| Testes | Vitest, Supertest e Playwright |
| Qualidade | TypeScript strict, GitHub Actions e npm audit |
| Organização | Monorepo com npm workspaces |

## Documentação

A documentação técnica e funcional está organizada em [docs/README.md](docs/README.md).

- [Visão geral do sistema](docs/01-visao-geral.md)
- [Requisitos funcionais, não funcionais e regras de negócio](docs/02-requisitos.md)
- [Arquitetura e decisões técnicas](docs/03-arquitetura.md)
- [Diagramas UML](docs/04-diagramas-uml.md)
- [Modelo de dados e DER](docs/05-banco-de-dados.md)
- [Referência da API](docs/06-api.md)
- [Segurança e controle de acesso](docs/07-seguranca.md)
- [Testes e qualidade](docs/08-testes.md)
- [Instalação e execução](docs/09-instalacao.md)
- [Roadmap](docs/10-roadmap.md)

## Licença

Distribuído sob a [licença MIT](LICENSE).
