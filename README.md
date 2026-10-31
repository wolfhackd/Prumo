# Sistema de Agendamentos

API REST para cadastro de responsáveis e estabelecimentos, oferta de serviços e agendamento de atendimentos. O backend é construído com Fastify, TypeScript, Prisma ORM e PostgreSQL.

> O repositório contém o backend da aplicação. Não há interface web ou mobile neste projeto.

## Funcionalidades disponíveis

- Cadastro de responsáveis e autenticação por e-mail ou CPF.
- Sessão de responsável por cookie HTTP-only com token JWT.
- Cadastro e atualização de estabelecimentos; consulta individual, listagem paginada pública e listagem dos estabelecimentos do responsável autenticado.
- Cadastro de horários de funcionamento por dia da semana.
- Cadastro, atualização e exclusão de serviços associados a um estabelecimento.
- Criação pública de agendamentos com cadastro ou reaproveitamento do cliente pelo CPF.
- Edição e exclusão de agendamentos por identificação do cliente e do agendamento.
- Validação do horário de funcionamento, duração do serviço e conflitos com agendamentos existentes.

Os endpoints e os formatos das requisições estão descritos em [docs/api.md](./docs/api.md). Requisitos do projeto e seu estado de implementação estão em [docs/requisitos.md](./docs/requisitos.md).

## Tecnologias

- Node.js (`^20.19`, `^22.12` ou `>=24.0`, conforme o requisito do Prisma instalado).
- TypeScript 7 e `tsx`.
- Fastify 5, com validação de entrada usando Zod.
- Prisma ORM 7 com o adaptador PostgreSQL `@prisma/adapter-pg`.
- PostgreSQL 15 ou superior.
- Vitest para testes.
- `bcrypt-ts` para hash e comparação de senhas; `jsonwebtoken` para tokens.

## Estrutura do projeto

```text
.
├── docs/                  # Referência da API e requisitos
├── prisma/
│   ├── migrations/        # Migrações versionadas
│   └── schema.prisma      # Modelos e relações do banco
├── src/
│   ├── index.ts           # Criação do servidor e registro de rotas
│   ├── lib/prisma.ts      # Cliente Prisma com adaptador PostgreSQL
│   ├── middleware/        # Autenticação das rotas protegidas
│   ├── modules/           # Módulos de domínio (owner, establishment, service, appointment)
│   └── utils/             # Cookies, senhas, tokens e conversão de horários
├── .env.example           # Modelo das variáveis de ambiente
└── docker-compose.yml     # PostgreSQL para desenvolvimento local
```

Cada módulo segue, em geral, a separação entre rotas, controller, service, repository e tipos/validação.

## Como executar localmente

### 1. Pré-requisitos

Instale uma versão compatível do Node.js e npm, além do Docker com o plugin Compose (ou disponibilize uma instância PostgreSQL 15+).

### 2. Instalar dependências e configurar ambiente

```powershell
npm ci
Copy-Item .env.example .env
```

Edite `.env` e configure:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | URL de conexão PostgreSQL. O exemplo corresponde ao banco local do Compose. |
| `JWT_SECRET` | Segredo aleatório forte, mantido fora do controle de versão, usado para assinar os tokens de sessão. |

### 3. Iniciar o PostgreSQL local (opcional)

O Compose do projeto inicia o serviço `db-service` na porta `5432` e cria o banco `myAppoimentSystem`. As credenciais definidas no Compose são apenas para desenvolvimento local.

```powershell
docker compose up -d db-service
```

Se estiver usando outro servidor PostgreSQL, atualize `DATABASE_URL` para apontar para ele.

### 4. Aplicar as migrações e gerar o cliente

```powershell
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` aplica as migrações já versionadas em `prisma/migrations`. Para criar uma nova migração durante o desenvolvimento, altere `prisma/schema.prisma` e execute `npx prisma migrate dev --name nome_da_migracao`.

### 5. Iniciar a API

```powershell
npm run dev
```

O servidor inicia na porta `3000`. O ponto de entrada é `src/index.ts`; o processo de desenvolvimento reinicia ao detectar mudanças.

Para compilar o backend para `dist/` e iniciar a versão compilada:

```powershell
npm run build
npm start
```

## Testes

Execute a suíte uma vez:

```powershell
npx vitest run
```

Execute os testes com relatório de cobertura:

```powershell
npm run test:coverage
```

O comando `npm test` executa o Vitest em modo watch.

## Modelo de dados

O schema Prisma define os seguintes modelos:

- **Owner**: responsável, com CPF e e-mail únicos; pode possuir vários estabelecimentos.
- **Establishment**: estabelecimento pertencente a um responsável; inclui dados de contato e localização.
- **BusinessHour**: intervalo de funcionamento associado a um estabelecimento e dia da semana.
- **Service**: serviço oferecido por um estabelecimento, com preço e duração em minutos.
- **Client**: cliente identificado por CPF único.
- **Appointment**: agendamento ligado opcionalmente a estabelecimento, serviço e cliente. O campo `status` é booleano e começa como `false`.

As relações completas e os campos estão em [prisma/schema.prisma](./prisma/schema.prisma).

## Estado e limitações conhecidas

- A API escuta na porta `3000`, definida diretamente no ponto de entrada.
- Há endpoints de criação, edição e exclusão de agendamentos e serviços;
  ainda não existem listagem pública/consulta individual de agendamentos, confirmação de atendimento ou fluxo de cancelamento por status.
- O endpoint de disponibilidade não existe; a disponibilidade é validada durante a criação e atualização do agendamento.
- Notificações a clientes não estão implementadas.
- O cadastro de horários usa dias de `1` (segunda-feira) a `7` (domingo) e horário `HH:MM`.
- Agendamentos são calculados para a próxima ocorrência futura do dia solicitado, usando UTC.
- Não há interface de usuário, configuração de CORS, rota de health check ou script para iniciar a versão compilada em produção.

Consulte [docs/requisitos.md](./docs/requisitos.md) para o detalhamento dos requisitos planejados e atendidos.
