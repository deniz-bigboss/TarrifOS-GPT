import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";

export type StorageUploadInput = {
  organizationId: string;
  requestId: string;
  fileName: string;
  fileType: string;
  bytes: ArrayBuffer | Uint8Array | Blob;
};

export type StorageProvider = {
  uploadFile(input: StorageUploadInput): Promise<{ storagePath: string }>;
  getSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string | null>;
  deleteFile(storagePath: string): Promise<void>;
  extractTextPlaceholder(storagePath: string): Promise<string>;
};

export class MockStorageProvider implements StorageProvider {
  async uploadFile(input: StorageUploadInput) {
    return {
      storagePath: `mock://${input.organizationId}/${input.requestId}/${input.fileName}`
    };
  }

  async getSignedUrl(storagePath: string) {
    return storagePath;
  }

  async deleteFile() {
    return;
  }

  async extractTextPlaceholder() {
    return "Document uploaded. Text extraction is pending in the free-first MVP.";
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  private bucket = "documents";

  async uploadFile(input: StorageUploadInput) {
    const client = createSupabaseServiceClient();
    if (!client) throw new Error("Supabase Storage requires SUPABASE_SERVICE_ROLE_KEY.");

    const storagePath = `${input.organizationId}/${input.requestId}/${Date.now()}-${input.fileName}`;
    const { error } = await client.storage.from(this.bucket).upload(storagePath, input.bytes, {
      contentType: input.fileType,
      upsert: false
    });

    if (error) throw error;
    return { storagePath };
  }

  async getSignedUrl(storagePath: string, expiresInSeconds = 3600) {
    const client = createSupabaseServiceClient();
    if (!client) return null;

    const { data, error } = await client.storage.from(this.bucket).createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }

  async deleteFile(storagePath: string) {
    const client = createSupabaseServiceClient();
    if (!client) return;

    const { error } = await client.storage.from(this.bucket).remove([storagePath]);
    if (error) throw error;
  }

  async extractTextPlaceholder() {
    return "Document uploaded to Supabase Storage. Text extraction is pending in the free-first MVP.";
  }
}

export function getStorageProvider(): StorageProvider {
  return isSupabaseServiceConfigured() ? new SupabaseStorageProvider() : new MockStorageProvider();
}
