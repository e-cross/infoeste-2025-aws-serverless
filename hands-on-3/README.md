### Hands-on 3 — Persistência de remessas no S3 (30 min)

Neste exercício você criará um bucket no Amazon S3, com leitura pública, concederá permissão para a Lambda escrever objetos nesse bucket e atualizará a função `CreateShipmentApiHandler` com o pacote deste hands-on para persistir as remessas como arquivos JSON.

---

#### Objetivo

- Criar um bucket S3 público para leitura
- Conceder permissão de escrita (PutObject) para a role da Lambda
- Atualizar a Lambda com o pacote deste hands-on para gravar no S3
- Validar a gravação conferindo o objeto no bucket

#### Pré‑requisitos

- Ter concluído o Hands-on 2 (API disponível)
- Região: `us-west-2`

#### Arquivos fornecidos

- Pacote da função: `CreateShipmentApiHandler/bundle.zip`
- Ponto de entrada (handler): `dist/index.handler`

---

### Passo a passo

**1. Criar o bucket S3**

- Acesse: Serviços > S3 > Create bucket
- Bucket name: `infoeste-2025-aws-serverless-{your-id}`, onde `{your-id}` é um identificador único seu
- Desmarque “Block all public access" e marque o checkbox concordando que isso pode tornar o bucket público
- Deixe todas as outras opções com os valores padrão
- Clique em Create bucket

Observação: o nome do bucket é globalmente único. Caso o nome esteja indisponível, varie o valor utilizado em `{your-id}` até que seja possível criar o bucket.

**2. Habilitar leitura pública (GetObject)**

- No bucket criado, vá em Permissions
- Em Block public access (bucket settings): confirme que está desabilitado para este bucket
- Em Bucket policy, adicione a policy abaixo substituindo `{bucket-name}` pelo nome utilizado na criação do bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::{bucket-name}/*"
    }
  ]
}
```

**3. Conceder permissão de escrita à Lambda**

- Vá em: Serviços > Lambda > `CreateShipmentApiHandler` > Configuration > Permissions
- Em Execution role, clique no nome da role para abrir no IAM
- Em Add permissions > Create inline policy
  - Service: S3
  - Actions: `s3:PutObject`
  - Resources: Selecione Specific > object > Add ARNs
    - Resource bucket name: o nome do bucket
    - Resource object name: marque a caixa Any object name
- Clique em Next, digite o Policy Name `AllowPutObjectToShipmentsBucket`
- Clique em Create policy

**4. Atualizar o código da Lambda (bundle do Hands-on 3)**

- Na função `CreateShipmentApiHandler`, abra Code > Code source
- Upload from > .zip file
- Selecione: `CreateShipmentApiHandler/bundle.zip` (deste diretório de hands-on)
- Confirme o upload
- Em Runtime settings, confirme o Handler `dist/index.handler` e o runtime `Node.js 22.x`

**5. Configurar variável de ambiente com nome do bucket**

- Ainda na função `CreateShipmentApiHandler`, acesse Configuration > Environment variables > Edit
- Adicione a variável:
  - Key: `SHIPMENTS_BUCKET_NAME`
  - Value: `{bucket-name}` (o nome do bucket criado no passo 1)
- Save

**6. Testar fim‑a‑fim pela API**

- Use o mesmo Invoke URL do Hands-on 2
- Endpoint: `POST {Invoke URL}/shipments`
- Payload de exemplo:

```json
{
  "orderId": "123456",
  "destinationCountry": "BR"
}
```

- Resultado esperado: HTTP 201 com corpo contendo `shipmentId`
- No S3, abra o bucket e confirme um objeto com a chave igual ao `shipmentId` retornado
- Clique no objeto e use o “Object URL” para visualizar o JSON (se 403, revise a bucket policy e o bloqueio de acesso público)

---

### Problemas comuns

- `AccessDenied` ao gravar no S3: confira a policy inline da role da Lambda (PutObject para `arn:aws:s3:::{bucket-name}/*`)
- `AccessDenied` ao gravar no S3: garanta que o nome do bucket esteja correto na variável de ambiente do lambda: `SHIPMENTS_BUCKET_NAME`
- `AccessDenied` ao ler via URL: verifique Bucket policy e bloqueio de acesso público

---

### Pontos para discussão

- Acesso público direto vs Presigned URLs
- Notificações do S3 para eventos (gatilhos para Lambda)
- Versionamento, object lock, TTL
- Tipo de armazenamento (standard, intelligent, infrequent access, glacier, ...)
- Website hosting
