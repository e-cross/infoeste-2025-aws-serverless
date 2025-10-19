### Hands-on 1 — Primeira Função AWS Lambda (30 min)

Este exercício guia você a criar e testar sua primeira função AWS Lambda usando o código já fornecido neste repositório. O foco é configurar o serviço e entender o fluxo — não programar.

---

#### Objetivo

- Criar uma função Lambda a partir de um pacote `.zip` pronto
- Executar um teste com um evento de exemplo e verificar a resposta

#### Pré‑requisitos

- Conta AWS individual com acesso ao console
- Permissão para criar Lambda e função de execução básica (CloudWatch Logs)
- Região: `us-east-1`

#### Arquivos fornecidos

- Pacote da função: `CreateShipmentHandler/bundle.zip`
- Ponto de entrada (handler): `index.handler`

---

### Passo a passo

**1. Criar a função Lambda**

- No Console AWS, acesse: Serviços > Lambda > Create function
- Escolha: Author from scratch
- Function name: `CreateShipmentHandler`
- Runtime: `Node.js 22.x`
- Architecture: `x86_64` (padrão)
- Permissions: deixar selecionada a opção padrão `Create a new role with basic Lambda permissions`
- Clique em Create function

**2. Fazer upload do código (bundle.zip)**

- Na função criada, em Code > Code source > Upload from > .zip file
- Selecione o arquivo: `CreateShipmentHandler/bundle.zip`
- Confirme o upload
- Em Runtime settings, garanta que o Handler seja `index.handler`

**3. Ajustar configurações (opcional)**

- General configuration > Edit
- Memory: 128 MB (padrão)
- Timeout: 3 segundos (suficiente para este exercício)
- Save

**4. Testar a função**

- Clique em Test > Test event > Create new event
- Event name: `create-shipment-test`
- Event JSON:

```json
{
  "orderId": "123456",
  "destinationCountry": "BR"
}
```

- Salve o payload do teste
- Execute o teste clicando no botão Test
- Resultado esperado: HTTP 200 da invocação com payload semelhante a:

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

**5. Verificar logs (opcional)**

- Em Monitor > View CloudWatch Logs
- Observe registros de execução (início/fim) da sua invocação

---

### Problemas comuns

- Handler incorreto: garanta `index.handler` após o upload do zip
- Estrutura do zip: o `bundle.zip` já está pronto; não recompacte pastas extras
- Runtime incompatível: use Node.js 22.x (compatível com `crypto.randomUUID`)

---

### Pontos para discussão

- Variáveis de ambiente
- Memória e timeout
- Cold start e provisioned concurrency
- Versões e aliases
