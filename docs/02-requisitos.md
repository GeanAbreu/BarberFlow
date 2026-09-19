# Especificação de requisitos

## Requisitos funcionais

| ID | Requisito | Ator principal |
| --- | --- | --- |
| RF-01 | Autenticar usuário por e-mail e senha e criar sessão JWT em cookie HTTP-only | Todos |
| RF-02 | Encerrar a sessão autenticada | Todos |
| RF-03 | Restringir recursos conforme os perfis `ADMIN` e `BARBEIRO` | Sistema |
| RF-04 | Cadastrar, editar, listar e desativar serviços | Administrador |
| RF-05 | Cadastrar, editar, listar e desativar barbeiros | Administrador |
| RF-06 | Definir expediente e percentual de comissão do barbeiro | Administrador |
| RF-07 | Cadastrar e listar clientes | Administrador |
| RF-08 | Criar agendamento com cliente, barbeiro, serviço, data e forma de pagamento | Administrador |
| RF-09 | Exibir agenda diária em colunas por barbeiro | Todos |
| RF-10 | Permitir transições entre os estados do atendimento | Todos |
| RF-11 | Atualizar agendas conectadas em tempo real | Sistema |
| RF-12 | Criar e remover bloqueios, folgas e horários especiais | Administrador |
| RF-13 | Cadastrar, editar, listar e desativar planos de assinatura | Administrador |
| RF-14 | Definir serviços e limite mensal de visitas de cada plano | Administrador |
| RF-15 | Vincular cliente a plano e controlar o estado da assinatura | Administrador |
| RF-16 | Gerar, quitar e reabrir mensalidades | Administrador |
| RF-17 | Validar elegibilidade e saldo antes de consumir visita de assinatura | Sistema |
| RF-18 | Exibir faturamento diário, semanal, mensal e por intervalo personalizado | Administrador |
| RF-19 | Exibir quantidade de atendimentos, ticket médio e serviços mais vendidos | Administrador |
| RF-20 | Calcular produção bruta e comissão por barbeiro | Administrador |
| RF-21 | Permitir ao barbeiro consultar apenas a própria produção e comissão | Barbeiro |
| RF-22 | Exportar relatório financeiro em CSV | Administrador |
| RF-23 | Registrar despesas com categoria, valor, data e forma de pagamento | Administrador |
| RF-24 | Consolidar receitas, despesas, saldo e valores por forma de pagamento | Administrador |
| RF-25 | Registrar fechamento diário e diferença de caixa | Administrador |
| RF-26 | Consultar histórico de serviços, profissionais, assinaturas e pagamentos do cliente | Administrador |
| RF-27 | Criar e processar lembretes de agendamento | Administrador/Sistema |

## Requisitos não funcionais

| ID | Categoria | Requisito |
| --- | --- | --- |
| RNF-01 | Segurança | Senhas devem ser armazenadas somente como hash bcrypt |
| RNF-02 | Segurança | A sessão deve usar cookie HTTP-only, `SameSite=Lax` e `Secure` em produção |
| RNF-03 | Segurança | A API deve aplicar RBAC independentemente das restrições da interface |
| RNF-04 | Segurança | Entradas externas devem ser validadas com schemas Zod |
| RNF-05 | Segurança | O login deve possuir limitação de tentativas |
| RNF-06 | Segurança | Segredos e bancos locais não podem ser versionados |
| RNF-07 | Consistência | Criação de horários concorrentes deve ser serializada no PostgreSQL |
| RNF-08 | Consistência | Consumo simultâneo da mesma franquia deve ser impedido |
| RNF-09 | Auditabilidade | Preço e comissão vigentes devem ser preservados no atendimento |
| RNF-10 | Desempenho | Atualizações da agenda devem ser distribuídas sem polling periódico |
| RNF-11 | Usabilidade | A interface deve ser responsiva e fornecer feedback de erro e estados vazios |
| RNF-12 | Acessibilidade | Textos e controles devem manter contraste adequado no tema escuro |
| RNF-13 | Manutenibilidade | Backend deve separar transporte, negócio e persistência por domínio |
| RNF-14 | Portabilidade | A aplicação deve executar com Docker ou PostgreSQL local no Windows |
| RNF-15 | Qualidade | Build, testes e auditoria de dependências devem executar na CI |
| RNF-16 | Compatibilidade | O frontend deve operar em navegadores modernos com suporte a EventSource |

## Regras de negócio

| ID | Regra |
| --- | --- |
| RN-01 | Somente administradores podem criar cadastros, acessar caixa e consultar dados financeiros globais |
| RN-02 | O barbeiro pode visualizar somente a própria agenda, bloqueios e rendimentos |
| RN-03 | Um barbeiro não pode possuir atendimentos ativos com intervalos sobrepostos |
| RN-04 | Um agendamento não pode ocupar um intervalo bloqueado para o profissional |
| RN-05 | O expediente do barbeiro deve ser mantido no cadastro e usado na apresentação da agenda; a validação rígida de horário está prevista no roadmap |
| RN-06 | Agendamentos cancelados não bloqueiam novos horários nem compõem faturamento |
| RN-07 | Somente atendimentos concluídos compõem produção e comissão |
| RN-08 | Atendimentos avulsos concluídos exigem forma de pagamento |
| RN-09 | A comissão é calculada por `preço no agendamento × percentual no agendamento ÷ 100` |
| RN-10 | Alterações futuras no serviço ou comissão não podem modificar relatórios históricos |
| RN-11 | Uma assinatura só pode cobrir serviços incluídos no contrato |
| RN-12 | A assinatura deve estar ativa e com mensalidade do período paga para permitir consumo |
| RN-13 | As visitas cobertas no mês não podem exceder a franquia contratada |
| RN-14 | Visita de assinatura gera produção e comissão, mas não adiciona receita avulsa |
| RN-15 | Receita de assinatura é reconhecida uma vez, quando a mensalidade é paga |
| RN-16 | Deve existir no máximo uma cobrança por assinatura e período |
| RN-17 | O fechamento do caixa deve ser único por data de negócio |
| RN-18 | Valor esperado do caixa é `fundo inicial + receitas − despesas` |
| RN-19 | Diferença do caixa é `valor contado − valor esperado` |
| RN-20 | Exclusão de serviços e profissionais é lógica quando o histórico precisa ser preservado |
| RN-21 | Consultas financeiras devem aceitar intervalos de no máximo 366 dias |
| RN-22 | Valores exportados devem ser sanitizados contra formula injection em planilhas |

## Critérios de aceite globais

- Operações não autorizadas retornam `401` ou `403` sem expor os dados solicitados.
- Violações de agenda e assinatura retornam erro de conflito com mensagem compreensível.
- Valores monetários são persistidos em campos `Decimal`.
- Mudanças na agenda aparecem nas sessões conectadas sem recarregar a página.
- As principais regras críticas são verificadas por testes automatizados.
