### Hands-on 2 — Expor API de criação de remessas (40 min)

Neste exercício você criará uma função Lambda para servir como backend HTTP e a expor via API Gateway (HTTP API). Ao final, você chamará a API para validar que tudo funcionou corretamente.

---

#### Objetivo

- Criar a função Lambda `CreateShipmentApiHandler` a partir do pacote `.zip`
- Criar uma API HTTP no API Gateway chamada `Shipment API` com rota `POST /shipments`
- Testar a API via cURL ou Postman

#### Pré‑requisitos

- Conta AWS individual com acesso ao console
- Permissão para criar Lambda, API Gateway (HTTP API) e CloudWatch Logs
- Região: `us-west-2`

#### Arquivos fornecidos

- Pacote da função: `CreateShipmentApiHandler/bundle.zip`
- Ponto de entrada (handler): `index.handler`

---

### Passo a passo

**1. Criar a função Lambda `CreateShipmentApiHandler`**

- No Console AWS, acesse: Serviços > Lambda > Create function
- Escolha: Author from scratch
- Function name: `CreateShipmentApiHandler`
- Runtime: `Node.js 22.x`
- Architecture: `x86_64` (padrão)
- Permissions: deixar selecionada a opção padrão `Create a new role with basic Lambda permissions`
- Clique em Create function

**2. Fazer upload do código (bundle.zip)**

- Na função criada, em Code > Code source > Upload from > .zip file
- Selecione o arquivo: `CreateShipmentApiHandler/bundle.zip`
- Confirme o upload
- Em Runtime settings, garanta que o Handler seja `index.handler`

**3. Criar a API HTTP no API Gateway**

- No Console AWS, acesse: Serviços > API Gateway > Create API
- Em HTTP API, clique em Build
- Defina o nome `Shipments API` e IP address type como `IPv4`
- Em Integrations, clique em Add integration, escolha Lambda e selecione a função `CreateShipmentApiHandler`
- Configure a rota:
  - Method: `POST`
  - Resource path: `/shipments`
  - Integration target: a função `CreateShipmentApiHandler`
- Stages: use o stage padrão `$default` com Auto-deploy habilitado
- Clique em Create para finalizar a API
- Depois de criada, identifique o host da sua API através do menu Deploy > Stages > Stage details > Invoke URL
- Endpoint efetivo para este exercício: `POST {Invoke URL}/shipments`

**4. Testar a API**

Payload de exemplo:

```json
{
  "orderId": "123456",
  "destinationCountry": "BR"
}
```

Resultado esperado (HTTP 201) — corpo similar a:

```json
{
  "shipmentId": "<uuid>",
  "status": "CREATED",
  "createdAt": "2025-01-01T12:34:56.000Z",
  "lastUpdatedAt": "2025-01-01T12:34:56.000Z",
  "destinationCountry": "BR",
  "orderId": "123456"
}
```

Testes via cURL

- Linux/macOS:

```bash
curl -i -X POST "{Invoke URL}/shipments" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"123456","destinationCountry":"BR"}'
```

- Windows (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri "{Invoke URL}/shipments" \
  -Headers @{"Content-Type"="application/json"} \
  -Body '{"orderId":"123456","destinationCountry":"BR"}' | ConvertTo-Json -Depth 5
```

Testes via Postman

- Crie uma nova requisição `POST` para `{Invoke URL}/shipments`
- Headers: `Content-Type: application/json`
- Body (raw / JSON): `{"orderId":"123456","destinationCountry":"BR"}`
- Envie a requisição e verifique o `201 Created` e o corpo de resposta

**5. Verificar logs (opcional)**

- Na função `CreateShipmentApiHandler`, acesse Monitor > View CloudWatch Logs
- Verifique os registros de invocações (incluindo event.body e validações)

---

### Problemas comuns

- Rota incorreta ou método errado: confirmar `POST /shipments`
- Handler incorreto na Lambda: garantir `index.handler`
- Integração não associada: confira se a rota aponta para a função correta
- Permissão de invocação: ao integrar pelo console, a permissão é criada automaticamente; se falhar, reanexe a integração
- Runtime incompatível: use Node.js 22.x

---

### Pontos para discussão

- Autorização: Lambda authorizer e Amazon Cognito (alto nível)
- Throttling e quotas
- Versionamento e estágios
- CORS
