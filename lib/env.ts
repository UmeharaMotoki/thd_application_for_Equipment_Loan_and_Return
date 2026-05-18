type FileStorageDriver = "local" | "s3";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readFileStorageDriver(): FileStorageDriver {
  const value = process.env.FILE_STORAGE_DRIVER ?? "local";
  if (value !== "local" && value !== "s3") {
    throw new Error("FILE_STORAGE_DRIVER must be 'local' or 's3'");
  }
  return value;
}

export function getServerEnv() {
  return {
    databaseUrl: readRequiredEnv("DATABASE_URL"),
    fileStorageDriver: readFileStorageDriver(),
    s3BucketName: process.env.S3_BUCKET_NAME ?? "",
    awsRegion: process.env.AWS_REGION ?? "ap-northeast-1",
  };
}
