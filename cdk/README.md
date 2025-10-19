## CDK - Infraestrutura como Código (IaC)

Este projeto CDK provisiona os recursos dos hands-on 3 e 4:

- Bucket S3 com leitura pública (via bucket policy)
- Lambda `CreateShipmentApiHandler` + HTTP API POST /shipments
- SQS `ShipmentEventsSQS`
- Lambda `IdentifyNewTrackingsHandler` (produtor) com permissão de `sqs:SendMessage`
- Lambda `ProcessTrackingHandler` (consumidor) com permissão S3 RW e trigger SQS

### Comandos

1. Instalar dependências

```bash
cd cdk && npm i
```

2. Synth (gerar CloudFormation)

```bash
npm run build && npx cdk synth
```

3. Deploy

```bash
npx cdk bootstrap # somente a primeira vez
npx cdk deploy
```

4. Destroy (opcional)

```bash
npx cdk destroy
```
