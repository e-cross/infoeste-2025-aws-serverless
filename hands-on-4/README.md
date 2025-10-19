### Hands-on 4 — Processamento assíncrono de eventos logísticos com SQS (60 min)

Neste exercício você criará uma fila SQS para desacoplar os processos de identificação e processamento de novos eventos logísticos de um Shipment. Você criará um Lambda produtor para simular eventos logísticos e publicá-los na fila, e um Lambda consumidor para processar as mensagens e atualizar os Shipments no S3 com os novos eventos.

---

#### Objetivo

- Criar a fila SQS `ShipmentEventsSQS`
- Criar a função `IdentifyNewTrackingsHandler` e publicar eventos na fila
- Criar a função `ProcessTrackingHandler` e processar mensagens do SQS atualizando o S3
- Validar o fluxo fim‑a‑fim

#### Pré‑requisitos

- Ter concluído o Hands-on 3 (bucket S3 criado e `CreateShipmentApiHandler` funcional)
- Possuir ao menos um `shipmentId` gerado anteriormente
- Região: `us-east-1`

#### Arquivos fornecidos

- `IdentifyNewTrackingsHandler/bundle.zip` (handler: `dist/index.handler`)
- `ProcessTrackingHandler/bundle.zip` (handler: `dist/index.handler`)

---

### Passo a passo

**1. Criar a fila SQS `ShipmentEventsSQS`**

- Acesse: Serviços > SQS > Create queue
- Type: Standard
- Name: `ShipmentEventsSQS`
- Deixe todos os demais campos com os valores padrão
- Clique em Create queue
- Copie o `Queue URL` e o `Queue ARN` (usará nos próximos passos)

**2. Criar a função Lambda `IdentifyNewTrackingsHandler`**

- Serviços > Lambda > Create function > Author from scratch
- Function name: `IdentifyNewTrackingsHandler`
- Runtime: `Node.js 22.x`
- Architecture: `x86_64`
- Create function
- Em Code > Upload from > .zip file
- Selecione: `IdentifyNewTrackingsHandler/bundle.zip`
- Runtime settings: Handler `dist/index.handler`

**Configurar variável de ambiente (SQS)**

- Configuration > Environment variables > Edit
- Key: `TRACKINGS_QUEUE_URL` | Value: `<Queue URL da ShipmentEventsSQS>`
- Save

**Permissão para publicar na fila**

- Configuration > Permissions > Execution role (abrir no IAM)
- Add permissions > Create inline policy
  - Service: SQS
  - Actions: `sqs:SendMessage`
  - Resources: Specific > cola o `Queue ARN` da `ShipmentEventsSQS`
- Next > Name: `AllowSendMessageToShipmentEventsSQS` > Create policy

**Teste rápido**

- No lambda, Test > Create new event
- Payload de teste:

```json
{ "shipmentId": "<SEU_SHIPMENT_ID>" }
```

- Execute o teste e verifique no SQS se há mensagens em Available messages

**3. Criar a função Lambda `ProcessTrackingHandler`**

- Create function > Author from scratch
- Function name: `ProcessTrackingHandler`
- Runtime: `Node.js 22.x`
- Architecture: `x86_64`
- Create function
- Code > Upload from > .zip file > selecione `ProcessTrackingHandler/bundle.zip`
- Runtime settings: Handler `dist/index.handler`

**Configurar variáveis de ambiente**

- Configuration > Environment variables > Edit
- Key: `SHIPMENTS_BUCKET_NAME` | Value: `<nome do bucket criado no Hands-on 3>`
- Save

**Permissões necessárias (S3 leitura/escrita e SQS consumo)**

- Configuration > Permissions > Execution role (abrir no IAM) > Create inline policy
  - Service: S3
  - Actions: `s3:GetObject`, `s3:PutObject`
  - Resources: Specific > object > `arn:aws:s3:::<bucket>/*`
- Clique em Add more permissions para criar a segunda
  - Service: SQS
  - Actions: `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes`
  - Resources: Specific > `Queue ARN` da `ShipmentEventsSQS`
- Next > Name: `RequiredShipmentEventsPermissions` > Create policy

**Configurar trigger do SQS (event source)**

- Na função `ProcessTrackingHandler`, aba Configuration > Triggers > Add trigger
- Source: SQS
- Queue: `ShipmentEventsSQS`
- Batch size: 10
- Deixe todos os demais campos com os valores padrão
- Add

**4. Testar o fluxo fim‑a‑fim**

- Crie um novo Shipment via `CreateShipmentApiHandler` e anote seu ID
- Execute o `IdentifyNewTrackingsHandler` com:

```json
{ "shipmentId": "<SHIPMENT_ID>" }
```

- Observe a fila SQS recebendo mensagens e depois esvaziando conforme o `ProcessTrackingHandler` consome
- Verifique no S3 o objeto do Shipment (key = `shipmentId`) e confira o atributo `events` preenchido e ordenado por `eventAt` (ascendente)
- Verifique os logs no CloudWatch Logs

---

### Problemas comuns

- Permissão insuficiente no SQS: verifique `sqs:SendMessage` (Identify) e `sqs:ReceiveMessage/DeleteMessage/GetQueueAttributes` (Process)
- Variáveis de ambiente ausentes: `TRACKINGS_QUEUE_URL` e `SHIPMENTS_BUCKET_NAME`
- Visibility timeout pequeno na fila: pode causar reprocessamento; aumente para ser maior que o timeout da Lambda
- Eventos não aparecem no S3: confira o nome do bucket e as permissões `s3:GetObject/PutObject`

---

### Pontos para discussão

- Lambda Event Source vs Polling
- SQS + Lambda: visibility timeout, batch size, concorrência e reprocessamento
- DLQ e redrive policy no SQS
- Idempotência no processamento de eventos
- Standard vs FIFO
