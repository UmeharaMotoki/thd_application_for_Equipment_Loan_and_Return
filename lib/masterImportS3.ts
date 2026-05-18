import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export async function fetchMasterXlsxFromS3(key: string): Promise<Buffer> {
  const bucket = process.env.MASTER_S3_BUCKET?.trim();
  if (!bucket) {
    throw new Error("MASTER_S3_BUCKET が未設定です。");
  }
  const region = process.env.AWS_REGION?.trim() || "ap-northeast-1";
  const client = new S3Client({ region });
  const out = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes?.length) {
    throw new Error(`S3 オブジェクトが空です: s3://${bucket}/${key}`);
  }
  return Buffer.from(bytes);
}

export function getConfiguredHrS3Key(): string | null {
  return process.env.MASTER_S3_HR_KEY?.trim() || null;
}

export function getConfiguredDeliveryS3Key(): string | null {
  return process.env.MASTER_S3_DELIVERY_KEY?.trim() || null;
}
