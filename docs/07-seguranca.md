# Segurança e controle de acesso

## Modelo de autenticação

1. O usuário envia e-mail e senha para `/auth/login`.
2. A API compara a senha com o hash bcrypt.
3. Uma sessão JWT de 12 horas é criada com identificador e perfil.
4. O token é armazenado em cookie HTTP-only.
5. A cada requisição protegida, a API valida assinatura, expiração e estado ativo do usuário.

## Matriz de acesso

| Recurso | ADMIN | BARBEIRO |
| --- | :---: | :---: |
| Própria agenda | Sim | Sim |
| Agenda de toda a equipe | Sim | Não |
| Atualizar atendimento próprio | Sim | Sim |
| Criar agendamento | Sim | Não |
| Gerenciar serviços, clientes e equipe | Sim | Não |
| Gerenciar assinaturas | Sim | Não |
| Consultar financeiro global | Sim | Não |
| Consultar rendimentos próprios | Sim | Sim |
| Registrar despesas e fechar caixa | Sim | Não |
| Gerenciar bloqueios | Sim | Não |
| Consultar bloqueios próprios | Sim | Sim |
| Exportar dados financeiros | Sim | Não |

## Controles implementados

- Hash de senha com bcrypt e custo 12.
- JWT assinado por segredo externo ao repositório.
- Cookie HTTP-only, `SameSite=Lax` e `Secure` em produção.
- Rate limit de login: 10 tentativas a cada 15 minutos.
- Helmet para headers HTTP defensivos.
- CORS limitado à origem configurada.
- Bloqueio de mutações originadas fora da aplicação autorizada.
- Payload JSON limitado e schemas Zod.
- RBAC executado na API e filtros de propriedade para dados do barbeiro.
- Sanitização de células na exportação CSV.
- Arquivos de ambiente, dados locais, builds e dependências ignorados pelo Git.

## Proteção de consistência

- Advisory locks do PostgreSQL serializam reservas concorrentes do mesmo barbeiro.
- Transações protegem a validação e criação do agendamento.
- Consumo de assinaturas é contado dentro da operação protegida.
- Unicidade no banco protege mensalidades, fechamentos e lembretes duplicados.
- Snapshots evitam alteração retroativa em relatórios financeiros.

## Segredos

As credenciais são recebidas pelas variáveis `DATABASE_URL`, `JWT_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`. O arquivo `.env.example` contém apenas exemplos e não deve receber valores reais.

## Recomendações de produção

- Usar HTTPS para frontend, API e banco.
- Gerar `JWT_SECRET` aleatório com alta entropia.
- Armazenar segredos no gerenciador da plataforma de hospedagem.
- Restringir a rede do PostgreSQL aos serviços autorizados.
- Executar migrations como etapa controlada de implantação.
- Configurar backup, retenção e testes periódicos de restauração.
- Ativar logs centralizados sem registrar senhas, tokens ou cookies.
