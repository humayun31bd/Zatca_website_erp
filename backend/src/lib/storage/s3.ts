import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Ensure AWS credentials and config are handled via environment variables
// AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "me-central-1", // default to KSA region
});

/**
 * Uploads generated ZATCA XML to S3/GCS.
 * 
 * @param fileName Name of the file (e.g. `INV-2026-001.xml`)
 * @param xmlContent The signed XML string
 * @param tenantId For organizing files in the bucket
 * @returns The S3 Key (path) where the file is stored
 */
export async function uploadXmlToStorage(fileName: string, xmlContent: string, tenantId: string): Promise<string> {
  const bucketName = process.env.STORAGE_BUCKET_NAME || "uae-invoice-zatca-xmls";
  const fileKey = `tenants/${tenantId}/invoices/${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: xmlContent,
      ContentType: "application/xml",
    });

    await s3Client.send(command);
    
    return fileKey;
  } catch (error) {
    console.error("Failed to upload XML to storage:", error);
    throw new Error("Storage Upload Failed");
  }
}
