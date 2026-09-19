# Referência da API

## Convenções

- Base local: `http://localhost:4000`.
- Corpo e respostas: JSON, exceto exportação CSV e stream SSE.
- Autenticação: cookie `bf_session` criado no login.
- Datas: ISO 8601 com offset quando recebidas pela API.
- Erros: objeto `{ "error": "mensagem" }`.
- Códigos principais: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409` e `429`.

## Autenticação

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/auth/login` | Público | Autentica e cria o cookie de sessão |
| POST | `/auth/logout` | Público | Remove o cookie da sessão |
| GET | `/auth/me` | Autenticado | Retorna o usuário atual |

## Usuários e catálogo

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/users` | Autenticado | Lista profissionais conforme o contexto |
| POST | `/users` | ADMIN | Cadastra barbeiro |
| PATCH | `/users/:id` | ADMIN | Atualiza profissional |
| DELETE | `/users/:id` | ADMIN | Desativa profissional |
| GET | `/services` | Autenticado | Lista serviços ativos |
| POST | `/services` | ADMIN | Cria serviço |
| PUT | `/services/:id` | ADMIN | Atualiza serviço |
| DELETE | `/services/:id` | ADMIN | Desativa serviço |
| GET | `/clients` | ADMIN | Lista clientes |
| POST | `/clients` | ADMIN | Cria cliente |
| GET | `/clients/:id/history` | ADMIN | Retorna histórico completo do cliente |

## Agenda

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/appointments?date=YYYY-MM-DD` | Autenticado | Lista agenda do dia, filtrada para barbeiros |
| POST | `/appointments` | ADMIN | Cria agendamento avulso ou por assinatura |
| PATCH | `/appointments/:id/status` | Autenticado | Atualiza estado e forma de pagamento |
| GET | `/events` | Autenticado | Mantém stream SSE da agenda autorizado por perfil |
| GET | `/schedule-blocks?from=&to=` | Autenticado | Lista bloqueios permitidos ao usuário |
| POST | `/schedule-blocks` | ADMIN | Cria bloqueio de agenda |
| DELETE | `/schedule-blocks/:id` | ADMIN | Remove bloqueio |

## Assinaturas

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/subscription-plans` | ADMIN | Lista planos |
| POST | `/subscription-plans` | ADMIN | Cria plano |
| PUT | `/subscription-plans/:id` | ADMIN | Atualiza plano |
| DELETE | `/subscription-plans/:id` | ADMIN | Desativa plano |
| GET | `/subscriptions` | ADMIN | Lista assinantes e cobranças |
| POST | `/subscriptions` | ADMIN | Contrata plano para cliente |
| PATCH | `/subscriptions/:id` | ADMIN | Altera estado da assinatura |
| POST | `/subscription-payments/:id/pay` | ADMIN | Quita mensalidade |
| POST | `/subscription-payments/:id/reopen` | ADMIN | Reabre mensalidade |

## Financeiro e operação

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/earnings/me?from=&to=` | Autenticado | Retorna produção do usuário atual |
| GET | `/finance?from=&to=` | ADMIN | Relatório financeiro consolidado |
| GET | `/finance/dashboard?from=&to=` | ADMIN | Cards, séries, serviços e comissões |
| GET | `/finance/export.csv?from=&to=` | ADMIN | Exporta relatório sanitizado |
| GET | `/operations/summary?from=&to=` | ADMIN | Consolida caixa, despesas e formas de pagamento |
| POST | `/expenses` | ADMIN | Registra despesa |
| POST | `/cash-closings` | ADMIN | Calcula e registra fechamento diário |
| POST | `/reminders/process` | ADMIN | Processa lote pendente de lembretes |
| GET | `/health` | Público | Verificação simples de disponibilidade |

## Eventos SSE

O endpoint `/events` envia eventos `agenda.updated`. Para `BARBEIRO`, a conexão recebe somente mudanças relacionadas ao próprio identificador. A interface recarrega os dados da agenda após o evento, mantendo o servidor como fonte de verdade.

## Intervalos financeiros

Parâmetros `from` e `to` devem ser datas ISO válidas, com `to` posterior a `from`. O intervalo máximo aceito é de 366 dias.
