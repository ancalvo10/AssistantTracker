import { S3Client } from '@aws-sdk/client-s3';

export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME ?? '',
    folderPrefix: process.env.AWS_FOLDER_PREFIX ?? ''
  };
}

export function createS3Client() {
  // S3_ENDPOINT permite usar almacenamiento compatible con S3 (Cloudflare R2, MinIO, etc.) fuera de la plataforma actual.
  // Las credenciales se toman de AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY si están definidas.
  return new S3Client(
    process.env.S3_ENDPOINT
      ? { endpoint: process.env.S3_ENDPOINT, region: process.env.AWS_REGION || 'auto', forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' }
      : {}
  );
}

export function getPublicFileUrl(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig();
  if (process.env.S3_PUBLIC_URL) return `${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/${cloud_storage_path}`;
  const region = process.env.AWS_REGION ?? 'us-east-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
}
