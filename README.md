# THD (Next.js + Prisma)

社内向け機器貸与/返却申請アプリです。  
本ディレクトリは **アプリ本体のみ** を管理し、ECR へデプロイすることを前提にしています。

## 前提

- Node.js 20 以上
- Docker / Docker Compose
- PostgreSQL（ローカルは `docker-compose.yml` を使用）

## 環境変数

`thd/.env.example` をコピーして `.env` を作成してください。

```bash
cp .env.example .env
```

主な変数:

- `DATABASE_URL` (必須)
- `FILE_STORAGE_DRIVER` (`local` or `s3`)
- `S3_BUCKET_NAME` (`FILE_STORAGE_DRIVER=s3` の場合)
- `AWS_REGION`

## ローカル開発

```bash
npm ci
npm run db:up
npm run db:migrate
npm run dev
```

## 本番ビルド（Docker）

```bash
docker build -t thd:latest .
docker run --rm -p 3000:3000 --env-file .env thd:latest
```

## ECR へ push（例）

事前に実行端末または CI に AWS CLI を導入しておいてください。  
（アプリコンテナ内に AWS CLI を同梱する必要はありません）

```bash
aws ecr get-login-password --region ap-northeast-1 \
| docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

docker build -t thd:latest .
docker tag thd:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/thd:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/thd:latest
```

## ディレクトリ運用ルール

- `thd` はアプリ実行に必要なもののみを保持する
- AWS CLI バンドル等の運用ツールは、アプリとは別の場所（例: ルートの `tools/` など）で管理する
- ビルドに不要なものは `.dockerignore` に追加して、ビルドコンテキストを最小化する
