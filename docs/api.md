# Referência da API

## Visão geral

- Base URL local: `http://localhost:3000`
- Formato: JSON
- Prefixo global `/api`: não utilizado; cada módulo registra suas rotas com prefixos próprios (`/owner`, `/establishment`, `/service`, `/appointment`).
- Validação dos corpos e parâmetros: Zod.
- Autenticação: cookie `token` com JWT nas rotas indicadas como protegidas.

Os exemplos de resposta abaixo refletem o formato enviado pelos controllers. Erros de validação do Zod retornam `400 Bad Request` no formato padrão do Fastify (`statusCode`, `error` e `message`). Nas rotas protegidas, a ausência de cookie retorna `401 Unauthorized` com `{"message":"User not logged"}`; token inválido ou expirado retorna `401` com `{"message":"Token invalid or expired"}`. Erros de negócio capturados pelos controllers também retornam `400`, com o formato indicado para cada rota. Erros internos não capturados seguem o tratamento padrão do Fastify.

## Rotas

| Método | Caminho | Autenticação | Descrição |
| --- | --- | --- | --- |
| `GET` | `/health` | Não | Verifica se a API está em execução. |
| `GET` | `/auth/status` | Sim | Verifica se o cookie JWT da sessão ainda é válido. |
| `POST` | `/owner/create` | Não | Cadastra um responsável. |
| `POST` | `/owner/login` | Não | Autentica por e-mail ou CPF e define o cookie de sessão. |
| `GET` | `/establishment/` | Não | Lista estabelecimentos com paginação, serviços e horários. |
| `GET` | `/establishment/:id` | Não | Consulta um estabelecimento, seus serviços e horários. |
| `GET` | `/establishment/owner` | Sim | Lista os estabelecimentos do responsável autenticado. |
| `POST` | `/establishment/create` | Sim | Cadastra um estabelecimento para o responsável autenticado. |
| `PATCH` | `/establishment/update` | Sim | Atualiza dados de um estabelecimento próprio. |
| `PUT` | `/establishment/update` | Sim | Alias de atualização; usa a mesma validação e lógica do `PATCH`. |
| `PATCH` | `/establishment/edit` | Sim | Alias de atualização; usa a mesma validação e lógica do `PATCH`. |
| `POST` | `/establishment/register-hour` | Sim | Registra um horário de funcionamento para estabelecimento próprio. |
| `POST` | `/service/create` | Sim | Cadastra um serviço em estabelecimento próprio. |
| `PATCH` | `/service/edit` | Sim | Atualiza um ou mais campos de um serviço próprio. |
| `DELETE` | `/service/delete` | Sim | Remove um serviço pertencente ao responsável autenticado. |
| `POST` | `/appointment/create` | Não | Cria um agendamento após validar serviço, funcionamento e conflitos. |
| `PATCH` | `/appointment/edit` | Não | Atualiza um agendamento do cliente, validando CPF, disponibilidade e dados do serviço/estabelecimento. |
| `PUT` | `/appointment/edit` | Não | Alias de atualização; usa a mesma validação e lógica do `PATCH`. |
| `DELETE` | `/appointment/delete` | Não | Remove um agendamento identificado por `appointmentId` e `cpf`. |

## Saúde e autenticação

### `GET /health`

Rota pública de liveness, útil para verificar se o processo da API está respondendo.

Sucesso: `200 OK`.

```json
{
  "status": "ok"
}
```

### `GET /auth/status`

Verifica o cookie `token` usando a mesma validação JWT das demais rotas protegidas. Em caso de sucesso, retorna os dados do responsável autenticado, sem senha ou estabelecimentos. Sucesso: `200 OK`.

```json
{
  "authenticated": true,
  "user": {
    "id": "UUID_DO_RESPONSAVEL",
    "name": "Ana Souza",
    "cpf": "12345678901",
    "phone": "+5511999999999",
    "email": "ana@example.com"
  }
}
```

Sem cookie, retorna `401 Unauthorized` com `{"message":"User not logged"}`. Token inválido ou expirado retorna `401` com `{"message":"Token invalid or expired"}`.

## Responsáveis

### `POST /owner/create`

Corpo:

```json
{
  "name": "Ana Souza",
  "cpf": "12345678901",
  "phone": "+5511999999999",
  "email": "ana@example.com",
  "password": "senha-segura"
}
```

Todos os campos são obrigatórios. Nome: até 50 caracteres; CPF: até 14; telefone: até 15; e-mail: até 50 e em formato válido; senha: até 50 caracteres. CPF e e-mail já cadastrados são rejeitados.

Sucesso: `201 Created`.

```json
{
  "message": "Owner created successfully!"
}
```

Erro de negócio: `400 Bad Request`, por exemplo `{"message":"Error creating owner!","error":"Email already exists"}`.

### `POST /owner/login`

Corpo:

```json
{
  "emailOrCpf": "ana@example.com",
  "password": "senha-segura"
}
```

Informe o e-mail ou CPF em `emailOrCpf`. Em caso de sucesso, a resposta `200 OK` define o cookie `token` e retorna:

```json
{
  "message": "Login successful!"
}
```

O JWT expira após uma hora. A senha é armazenada com hash bcrypt. Falhas de login retornam `400 Bad Request`, por exemplo `{"message":"Error logging in!","error":"Owner not found"}`.

O cookie é `httpOnly`, `sameSite=lax` e tem `path=/`. O projeto precisa da variável `JWT_SECRET` configurada no ambiente.

## Estabelecimentos

### `GET /establishment/:id`

O parâmetro `id` precisa ser um UUID. Sucesso: `200 OK`, com o objeto `establishment`, incluindo `services` e `businessHours`:

```json
{
  "establishment": {
    "id": "UUID_DO_ESTABELECIMENTO",
    "name": "Estúdio Central",
    "email": "contato@example.com",
    "phone": "+5511999999999",
    "createdAt": "2026-10-30T12:00:00.000Z",
    "updatedAt": "2026-10-30T12:00:00.000Z",
    "website": null,
    "location": null,
    "ownerId": "UUID_DO_RESPONSAVEL",
    "services": [],
    "businessHours": []
  }
}
```

Se não existir, retorna `404 Not Found` com `{"message":"Establishment not found!"}`.

### `GET /establishment/`

Lista estabelecimentos publicamente, com paginação opcional por query string: `page` (padrão `1`, inteiro mínimo `1`) e `limit` (padrão `10`, inteiro entre `1` e `100`). Exemplo: `GET /establishment/?page=2&limit=5`.

Sucesso: `200 OK`. O corpo é um array; cada estabelecimento contém seus campos e as relações `services` e `businessHours`:

```json
[
  {
    "id": "UUID_DO_ESTABELECIMENTO",
    "name": "Estúdio Central",
    "email": "contato@example.com",
    "phone": "+5511999999999",
    "createdAt": "2026-10-30T12:00:00.000Z",
    "updatedAt": "2026-10-30T12:00:00.000Z",
    "website": null,
    "location": null,
    "ownerId": "UUID_DO_RESPONSAVEL",
    "services": [],
    "businessHours": []
  }
]
```

Quando não houver resultados, a rota responde `400 Bad Request` com `{"message":"Error getting establishments!","error":"No establishments found!"}`.

### `GET /establishment/owner`

Requer sessão de responsável. Retorna `200 OK` com `{ "establishments": [...] }`, incluindo `services` e `businessHours` de cada estabelecimento. A lista é filtrada pelo responsável autenticado; se ele não tiver estabelecimentos, retorna uma lista vazia. Cada item tem o mesmo formato do exemplo em [`GET /establishment/`](#get-establishment).

```json
{
  "establishments": []
}
```

### `POST /establishment/create`

Requer sessão de responsável. O `ownerId` é obtido do token; não deve ser enviado pelo cliente.

```json
{
  "name": "Estúdio Central",
  "email": "contato@example.com",
  "phone": "+5511999999999"
}
```

Sucesso: `201 Created`. O e-mail do estabelecimento precisa ser único; os campos `name`, `email` e `phone` são validados como strings, mas não há validação de formato para o e-mail nesse endpoint.

```json
{
  "message": "Estúdio Central Establishment created successfully!"
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"message":"Error creating establishment!","error":"Establishment already exists!"}`.

### `PATCH /establishment/update` e aliases

Requer sessão. Envie o identificador e pelo menos um campo para alterar:

```json
{
  "establishmentId": "UUID_DO_ESTABELECIMENTO",
  "name": "Estúdio Central",
  "website": "https://example.com",
  "location": "São Paulo"
}
```

Campos aceitos: `name`, `email`, `phone`, `website` e `location`; exceto pelo `establishmentId`, são opcionais, mas pelo menos um deve ser enviado. `email` precisa ter formato válido; `website` e `location` aceitam `null`. O responsável autenticado precisa ser dono do estabelecimento. Sucesso: `200 OK`:

```json
{
  "message": "Establishment updated successfully!",
  "establishment": {
    "id": "UUID_DO_ESTABELECIMENTO",
    "name": "Estúdio Central",
    "email": "contato@example.com",
    "phone": "+5511999999999",
    "createdAt": "2026-10-30T12:00:00.000Z",
    "updatedAt": "2026-10-30T12:05:00.000Z",
    "website": "https://example.com",
    "location": "São Paulo",
    "ownerId": "UUID_DO_RESPONSAVEL"
  }
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"message":"Error updating establishment!","error":"User is not the owner of the establishment!"}`.

### `POST /establishment/register-hour`

Requer sessão de responsável:

```json
{
  "establishmentId": "UUID_DO_ESTABELECIMENTO",
  "dayOfWeek": 1,
  "openingTime": "09:00",
  "closingTime": "17:00"
}
```

`dayOfWeek`: inteiro entre `1` (segunda-feira) e `7` (domingo). Horários: formato 24 horas `HH:MM`, com abertura anterior ao fechamento. O responsável precisa ser dono do estabelecimento. Sucesso: `201 Created`.

```json
{
  "message": "Business hour registered successfully!"
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"message":"Error registering business hour!","error":"Invalid time format!"}`.

## Serviços

### `POST /service/create`

Requer sessão de responsável. O nome do campo esperado para o ID do estabelecimento é `establishId`.

```json
{
  "name": "Consulta",
  "description": "Atendimento individual",
  "price": 120,
  "duration": 60,
  "establishId": "UUID_DO_ESTABELECIMENTO"
}
```

Todos os campos são obrigatórios e devem ser strings/números conforme o exemplo; `name` e `description` não podem ser vazios; `price` e `duration` devem ser números maiores ou iguais a `1`. A duração é expressa em minutos. O estabelecimento precisa pertencer ao responsável autenticado. Sucesso: `201 Created`:

```json
{
  "message": "Service created successfully"
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"message":"Error to create service","error":"Establishment not found or you are not the owner"}`.

### `PATCH /service/edit`

Requer sessão de responsável. Informe o serviço e pelo menos um campo para alterar:

```json
{
  "serviceId": "UUID_DO_SERVICO",
  "name": "Consulta inicial",
  "price": 150,
  "duration": 45
}
```

Campos editáveis: `name`, `description`, `price` e `duration`; exceto pelo `serviceId`, são opcionais, mas pelo menos um deve ser enviado. `description` também aceita `null`; preço deve ser pelo menos `1`, e duração deve ser um inteiro de pelo menos `1` minuto. O responsável autenticado precisa ser dono do estabelecimento associado ao serviço. Sucesso: `200 OK`:

```json
{
  "message": "Service updated successfully",
  "service": {
    "id": "UUID_DO_SERVICO",
    "name": "Consulta inicial",
    "description": "Atendimento individual",
    "price": 150,
    "duration": 45,
    "establishmentId": "UUID_DO_ESTABELECIMENTO"
  }
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"message":"Error to update service","error":"Service not found!"}`.

### `DELETE /service/delete`

Requer sessão de responsável. Delete o serviço associado ao responsável autenticado:

```json
{
  "serviceId": "UUID_DO_SERVICO"
}
```

O `serviceId` deve ser um UUID válido e o responsável precisa ser dono do estabelecimento associado ao serviço. Sucesso: `200 OK`:

```json
{
  "message": "Service deleted successfully"
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"message":"Error to delete service","error":"User is not the owner of the establishment!"}`.

## Agendamentos

### `POST /appointment/create`

Não exige autenticação:

```json
{
  "establishmentId": "UUID_DO_ESTABELECIMENTO",
  "serviceId": "UUID_DO_SERVICO",
  "hour": "10:30",
  "dayOfWeek": 1,
  "name": "João da Silva",
  "cpf": "12345678901",
  "phone": "+5511999999999",
  "email": "joao@example.com"
}
```

Todos os campos são obrigatórios. `establishmentId` e `serviceId` precisam ser UUIDs; `hour` usa `HH:MM`; `dayOfWeek` é um inteiro de `1` (segunda-feira) a `7` (domingo); `name` exige ao menos 3 caracteres; CPF aceita de 11 a 14 caracteres; telefone exige ao menos 10 caracteres; e `email` precisa ter formato válido.

O sistema valida que o estabelecimento e o serviço existem, que o serviço pertence ao estabelecimento, que o estabelecimento abre naquele dia e que o serviço cabe integralmente em um dos intervalos de funcionamento. A data é calculada para a próxima ocorrência futura do dia e hora informados, em UTC; se a hora já passou no dia atual, o agendamento é direcionado para a semana seguinte.

Os conflitos com outros agendamentos do estabelecimento são verificados por sobreposição de duração dentro de uma transação serializável. O cliente é criado ou associado pelo CPF. Sucesso: `200 OK`:

```json
{
  "message": "Appointment created successfully"
}
```

A rota não retorna o registro criado. Erros de negócio retornam `400 Bad Request`, por exemplo `{"error":"Error to create appointment","message":"Appointment time is already booked!"}`.

### `PATCH /appointment/edit` e alias `PUT /appointment/edit`

Não exige autenticação. O cliente identifica o agendamento pelo `appointmentId` e pelo `cpf` cadastrado. Envie pelo menos um campo para alterar:

```json
{
  "appointmentId": "UUID_DO_AGENDAMENTO",
  "cpf": "12345678901",
  "hour": "11:00",
  "dayOfWeek": 2,
  "phone": "+551188887777",
  "email": "joao.novo@example.com"
}
```

Campos aceitos: `hour`, `dayOfWeek`, `serviceId`, `establishmentId`, `name`, `phone`, `email`; pelo menos um deve ser enviado. Horário, dia da semana, IDs e dados do cliente seguem as mesmas validações descritas para criação. Quando `hour` ou `dayOfWeek` são alterados, o sistema recalcula a próxima data válida e valida abertura do estabelecimento e pertencimento do serviço ao estabelecimento. Atualmente, a edição não verifica conflitos com outros agendamentos; alterações somente de `serviceId` ou `establishmentId` também não passam por essas validações de funcionamento/compatibilidade. Sucesso: `200 OK`, com o registro atualizado:

```json
{
  "message": "Appointment updated successfully",
  "appointment": {
    "id": "UUID_DO_AGENDAMENTO",
    "data": "2026-11-02T11:00:00.000Z",
    "status": false,
    "createdAt": "2026-10-30T12:00:00.000Z",
    "establishmentId": "UUID_DO_ESTABELECIMENTO",
    "serviceId": "UUID_DO_SERVICO",
    "clientId": "UUID_DO_CLIENTE"
  }
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"error":"Error to update appointment","message":"Appointment not found for this client"}`.

### `DELETE /appointment/delete`

Não exige autenticação. O cliente identifica o agendamento pelo `appointmentId` e pelo `cpf` cadastrado do cliente associado:

```json
{
  "appointmentId": "UUID_DO_AGENDAMENTO",
  "cpf": "12345678901"
}
```

O sistema valida que o agendamento pertence ao CPF informado antes de removê-lo. Sucesso: `200 OK`:

```json
{
  "message": "Appointment deleted successfully"
}
```

Erros de negócio retornam `400 Bad Request`, por exemplo `{"error":"Error to delete appointment","message":"Appointment not found for this client"}`.

## Comportamentos ainda não disponíveis

Ainda não existem rotas para listar agendamentos, consultar individualmente um atendimento, confirmar ou cancelar por status, listar clientes, consultar horários disponíveis em endpoint específico ou enviar notificações. A API já implementa criação, edição e exclusão de agendamentos e serviços, porém a consulta e gestão avançada continuam fora do escopo atual.
