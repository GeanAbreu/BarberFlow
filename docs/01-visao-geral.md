# Visão geral do sistema

## Objetivo

O BarberFlow é um sistema web interno que organiza a operação diária e o controle financeiro de uma barbearia. Seu objetivo é manter agenda, produção, recorrência, caixa e histórico em uma única fonte de dados, com acesso compatível com a responsabilidade de cada profissional.

## Atores

| Ator | Responsabilidade |
| --- | --- |
| Administrador | Configura a operação, gerencia cadastros, acompanha indicadores, registra caixa e consulta dados globais |
| Barbeiro | Consulta a própria agenda, atualiza os atendimentos sob sua responsabilidade e acompanha os próprios rendimentos |
| Cliente | Entidade atendida pela operação; possui histórico, agendamentos e assinaturas |
| WhatsApp Cloud API | Serviço externo opcional para entrega dos lembretes de agendamento |

## Escopo funcional

1. **Autenticação e autorização:** sessão segura, identificação do usuário e perfis de acesso.
2. **Agenda:** visualização diária, criação de horários, mudança de estado, conflitos e atualização em tempo real.
3. **Cadastros:** serviços, clientes, barbeiros, expedientes e comissões.
4. **Assinaturas:** planos, serviços incluídos, franquia mensal, cobranças e pagamentos.
5. **Financeiro:** faturamento, ticket médio, produção, comissões, gráficos e exportação.
6. **Operação de caixa:** despesas, formas de pagamento, saldo e fechamento diário.
7. **Disponibilidade:** folgas, bloqueios e horários especiais por profissional.
8. **Relacionamento:** histórico detalhado do cliente e fila de lembretes.

## Jornadas principais

### Atendimento avulso

1. O administrador cadastra ou seleciona o cliente.
2. Seleciona barbeiro, serviço, data, horário e forma de pagamento.
3. A API valida expediente, bloqueios e conflitos.
4. O agendamento é publicado em tempo real para as agendas conectadas.
5. O barbeiro inicia e conclui o atendimento.
6. A produção, receita e comissão passam a compor os relatórios.

### Atendimento por assinatura

1. O administrador associa um cliente a um plano.
2. O sistema mantém preço, serviços e franquia contratados como snapshot.
3. A mensalidade do período deve estar paga.
4. O serviço precisa pertencer ao plano e existir saldo de visitas.
5. A visita gera produção e comissão, enquanto a receita é reconhecida no pagamento da mensalidade.

### Fechamento de caixa

1. O administrador seleciona a data e informa fundo inicial e valor contado.
2. O sistema consolida receitas avulsas, mensalidades e despesas.
3. O valor esperado é calculado automaticamente.
4. A diferença entre o valor contado e o esperado é persistida.

## Limites atuais

- Uma instalação representa uma barbearia.
- O envio pelo WhatsApp depende de credenciais externas e templates aprovados pela Meta.
- A exportação financeira atual é fornecida em CSV.
- O fuso operacional de referência é `America/Sao_Paulo`.
