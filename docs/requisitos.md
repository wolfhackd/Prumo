# Requisitos e estado de implementação

## Objetivo

Facilitar o agendamento de serviços e o gerenciamento de estabelecimentos, serviços e atendimentos.

## Perfis previstos

- **Responsável**: administra os estabelecimentos e os serviços oferecidos.
- **Cliente**: informa seus dados e solicita um agendamento.

## Problemas que motivam o sistema

- Demora para marcar serviços.
- Dificuldade para gerenciar estabelecimentos, serviços e agendamentos.
- Falta de comunicação eficiente com clientes.
- Dificuldade para verificar horários disponíveis.
- Falta de ferramentas para gerenciar clientes.

## Requisitos funcionais

| ID | Requisito | Estado no backend |
| --- | --- | --- |
| RF01 | Agendar um horário de atendimento. | **Parcial** — cria agendamentos e valida funcionamento e conflitos; não há interface no repositório. |
| RF02 | Gerenciar agendamentos. | **Parcial** — há criação, edição e exclusão por identidade do agendamento e do cliente; consulta individual, listagem e confirmação ainda não estão disponíveis. |
| RF03 | Comunicar-se com os clientes. | **Não implementado** — não há integração ou envio de notificações. |
| RF04 | Verificar horários disponíveis. | **Parcial** — a validação acontece ao criar e atualizar um agendamento; não há endpoint para consultar disponibilidade. |
| RF05 | Excluir agendamentos. | **Parcial** — há rota de exclusão com validação por `appointmentId` e `cpf`, mas ainda não há fluxo completo de cancelamento por status/cliente. |
| RF06 | Consultar estabelecimentos e seus serviços/horários. | **Implementado no backend** — há consulta individual, listagem pública paginada e listagem dos estabelecimentos do responsável autenticado. |

## Requisitos não funcionais

| ID | Requisito | Estado no repositório |
| --- | --- | --- |
| RNF01 | Funcionar em dispositivos móveis. | Não avaliável neste backend; não há cliente web ou mobile no repositório. |
| RNF02 | Ser fácil de usar e compreender. | Não avaliável sem uma interface de usuário. |
| RNF03 | Ser confiável e estável. | Parcialmente apoiado por validação, testes unitários e verificação transacional de conflitos; não há evidência de monitoramento ou disponibilidade operacional. |
| RNF04 | Ser escalável e flexível. | Não há configuração ou teste de escala documentado. |
| RNF05 | Somente usuários autorizados podem modificar estabelecimentos. | Parcial — criação, atualização, cadastro de horários e serviços exigem autenticação e verificam a titularidade; a consulta pública do estabelecimento e a criação pública de agendamentos não exigem autenticação. |

## Regras de negócio

| ID | Regra | Estado no backend |
| --- | --- | --- |
| RN01 | O cliente fornece os dados necessários para solicitar um agendamento. | Implementado na validação da requisição de criação. |
| RN02 | O cliente informa o horário desejado. | Implementado; formato `HH:MM`. |
| RN03 | O cliente seleciona o serviço desejado. | Implementado por `serviceId`; o serviço precisa pertencer ao estabelecimento informado. |
| RN04 | O horário precisa estar livre. | Implementado por verificação de sobreposição com outros agendamentos. |
| RN05 | Não pode haver dois agendamentos no mesmo horário. | Implementado com verificação de conflitos por duração, dentro de transação serializável. |
| RN06 | A data é a próxima ocorrência futura do dia da semana informado. | Implementado usando UTC; se a hora do dia atual já passou, considera a semana seguinte. |
| RN07 | O responsável confirma o agendamento antes do atendimento. | Não implementado; há um campo `status` inicializado como `false`, mas não existe rota de confirmação. |
| RN08 | O cliente recebe uma notificação antes do atendimento. | Não implementado. |
| RN09 | O cliente pode consultar seus agendamentos e serviços. | Parcial — serviços e informações de um estabelecimento podem ser consultados; não há consulta de agendamentos do cliente. |

## Referências

- [README do projeto](../README.md): instalação, execução, tecnologias e arquitetura.
- [Referência da API](./api.md): rotas, autenticação, payloads e validações.