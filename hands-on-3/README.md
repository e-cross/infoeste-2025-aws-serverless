Adicionar a policy abaixo em "Permissions > Bucket policy" substituindo `{bucket-arn}` pelo ARN do seu bucket:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "*"
            },
            "Action": "s3:GetObject",
            "Resource": "{bucket-arn}/*"
        }
    ]
}
```
