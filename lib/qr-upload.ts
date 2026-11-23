import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3Client, getBucketConfig, getPublicFileUrl } from './aws-config';
import QRCode from 'qrcode';

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

/**
 * Generates a QR code image, uploads it to S3 as public, and returns the public URL.
 */
export async function generateAndUploadQR(qrToken: string, attendeeId: string): Promise<string> {
  // Generate QR as PNG buffer
  const qrBuffer = await QRCode.toBuffer(qrToken, {
    width: 400,
    margin: 2,
    type: 'png',
    color: { dark: '#000000', light: '#ffffff' }
  });

  const cloud_storage_path = `${folderPrefix}public/qr-codes/${attendeeId}-${Date.now()}.png`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
      Body: qrBuffer,
      ContentType: 'image/png',
    })
  );

  return getPublicFileUrl(cloud_storage_path);
}
