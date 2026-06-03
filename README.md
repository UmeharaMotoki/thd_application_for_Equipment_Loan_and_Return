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

- `DATABASE_URL` (DB 保存時)
- `THD_LENDING_EXPORT_DIR` — 機器貸与 Excel の保存先（未設定時: リポジトリ `要件定義/テスト/`）
- `THD_SUBMISSION_MODE=json` — JSON 必須保存モード
- `THD_JSON_SUBMISSION_DIR` — 下流 JSON の保存先上書き
- `FILE_STORAGE_DRIVER` (`local` or `s3`)
- `S3_BUCKET_NAME` (`FILE_STORAGE_DRIVER=s3` の場合)
- `AWS_REGION`
- `MASTER_IMPORT_SECRET` — マスタ取込 API

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

## ドキュメント

| 種別 | パス |
|------|------|
| 業務・機能要件 | `../要件定義/要件/`（D2: `03_D2_機器貸与.md`） |
| Excel 出力仕様 | `../要件定義/要件/機能要件/03_D2_機器貸与_Excel出力仕様.md` |
| 基本設計 | `../設計書・仕様書/THD_基本設計.md` |
| 詳細設計（D2） | `../設計書・仕様書/THD_詳細設計_D2_機器貸与.md` |
| AWS 構築手順 | `../設計書・仕様書/AWS構築・設定手順.md` |

## DB マイグレーション（D2 複数利用者）

```bash
npm run db:migrate
# dev サーバー停止後
npx prisma generate
```

未適用時は機器貸与登録で Prisma エラー（`lendingStartDate` 等）や Excel 未生成になり得ます。

## ディレクトリ運用ルール

- `thd` はアプリ実行に必要なもののみを保持する
- AWS CLI バンドル等の運用ツールは、アプリとは別の場所（例: ルートの `tools/` など）で管理する
- ビルドに不要なものは `.dockerignore` に追加して、ビルドコンテキストを最小化する
