import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { ENV } from "./env.js";

const s3 = new S3Client({
  endpoint: ENV.s3Endpoint,
  region: ENV.s3Region,
  credentials: {
    accessKeyId: ENV.s3AccessKey,
    secretAccessKey: ENV.s3SecretKey,
  },
  forcePathStyle: true,
});

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ url: string; key: string }> {
  await s3.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const url = `${ENV.s3PublicUrl}/${key}`;
  return { url, key };
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
    })
  );
}
