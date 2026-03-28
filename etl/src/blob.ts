import { ContainerClient } from "@azure/storage-blob";

export type BlobFile = {
  name: string;
  size: number;
  lastModified: Date | null;
};

function getContainerClient(containerUrl: string) {
  return new ContainerClient(containerUrl);
}

export async function listContainerBlobs(containerUrl: string): Promise<BlobFile[]> {
  const client = getContainerClient(containerUrl);
  const blobs: BlobFile[] = [];

  for await (const blob of client.listBlobsFlat()) {
    blobs.push({
      name: blob.name,
      size: blob.properties.contentLength ?? 0,
      lastModified: blob.properties.lastModified ?? null
    });
  }

  return blobs.sort((left, right) => left.name.localeCompare(right.name));
}

export async function downloadBlobBuffer(containerUrl: string, blobName: string) {
  const client = getContainerClient(containerUrl).getBlobClient(blobName);
  const response = await client.download();

  if (!response.readableStreamBody) {
    throw new Error("Azure blob download did not return a readable stream.");
  }

  const chunks: Buffer[] = [];

  for await (const chunk of response.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
