# Roadmap do BarberFlow

## Entregue

- Autenticação JWT e autorização por perfil.
- Agenda diária com atualização em tempo real por Server-Sent Events.
- Controle transacional de conflitos e consumo de assinaturas.
- Serviços, clientes, equipe, expediente e comissões.
- Planos recorrentes, mensalidades e franquia de visitas.
- Dashboard financeiro, gráficos, filtros e CSV.
- Formas de pagamento, despesas e fluxo de caixa.
- Fechamento diário com diferença entre valor esperado e contado.
- Folgas e bloqueios de agenda.
- Histórico detalhado do cliente.
- Fila de lembretes com adaptador para WhatsApp Cloud API.
- API modular por domínio com controllers, services e repositories.
- Testes integrados da API e testes de interface com Playwright.
- Pipeline de integração contínua.

## Próximas versões

### v1.1 — Comunicação

- Templates aprovados pela Meta para lembretes automáticos.
- Retentativas com backoff e processamento assíncrono da fila.
- Confirmação e cancelamento pelo cliente.

### v1.2 — Inteligência operacional

- Comparativos por período e metas por profissional.
- Taxa de ocupação, cancelamento e recorrência de clientes.
- Projeção de receita recorrente.

### v1.3 — Produto

- Gestão de múltiplas unidades.
- Permissões configuráveis por função.
- Auditoria de alterações administrativas.
- Aplicativo instalável com recursos de PWA.

## Critérios de qualidade

Cada versão deve manter builds de produção, migrations reproduzíveis, testes de autorização e regras financeiras, auditoria de dependências e documentação atualizada.
