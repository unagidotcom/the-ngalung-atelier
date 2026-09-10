import { Readable } from 'stream';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  IObjectStorageService,
  StorageProviderType,
  StorageUploadResult,
  StorageDownloadResult,
  StorageFileMetadata
} from './types';
import { StorageDiagnosticStatus } from '../../src/types';

export class SupabaseStorageProvider implements IObjectStorageService {
  readonly providerType: StorageProviderType = 'supabase';
  private client: SupabaseClient | null = null;
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucketName: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'private_products';
  }

  isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.serviceRoleKey && this.bucketName);
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new Error(
          'Supabase storage is not fully configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
        );
      }
      this.client = createClient(this.supabaseUrl, this.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return this.client;
  }

  private async ensureBucketExists(): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase.storage.getBucket(this.bucketName);
    if (!error) return;

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      throw new Error(`Unable to verify Supabase Storage buckets: ${listError.message}`);
    }

    const found = buckets?.some(bucket => bucket.name === this.bucketName);
    if (found) return;

    const maxMb = Number(process.env.MAX_PRODUCT_FILE_MB) || 100;
    const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
      public: false,
      fileSizeLimit: maxMb * 1024 * 1024
    });

    if (createError) {
      const message = createError.message || '';
      if (message.toLowerCase().includes('already exists')) return;
      throw new Error(`Supabase Storage bucket '${this.bucketName}' could not be created: ${message}`);
    }
  }

  async uploadPrivateFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageUploadResult> {
    const supabase = this.getClient();
    const cleanKey = key.replace(/^\/+/, '');
    await this.ensureBucketExists();

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(cleanKey, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: true,
        metadata: metadata || {}
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const uploadedAt = new Date().toISOString();

    return {
      storageKey: cleanKey,
      storageProvider: 'supabase',
      fileSizeBytes: buffer.length,
      mimeType: mimeType || 'application/octet-stream',
      checksumSha256: checksum,
      uploadedAt
    };
  }

  async downloadPrivateFile(key: string): Promise<StorageDownloadResult> {
    const supabase = this.getClient();
    const cleanKey = key.replace(/^\/+/, '');

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .download(cleanKey);

    if (error || !data) {
      throw new Error(`Supabase Storage download failed for key ${cleanKey}: ${error?.message || 'File not found'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    return {
      stream,
      buffer,
      contentLength: buffer.length,
      mimeType: data.type || 'application/octet-stream',
      checksumSha256: checksum,
      storageKey: cleanKey
    };
  }

  async deletePrivateFile(key: string): Promise<boolean> {
    try {
      const supabase = this.getClient();
      const cleanKey = key.replace(/^\/+/, '');
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .remove([cleanKey]);

      if (error) {
        console.error(`[SUPABASE STORAGE] Delete error for key ${cleanKey}:`, error.message);
        return false;
      }
      return Boolean(data && data.length > 0);
    } catch (err: any) {
      console.error(`[SUPABASE STORAGE] Delete exception for key ${key}:`, err.message);
      return false;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const meta = await this.getMetadata(key);
      return meta !== null;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageFileMetadata | null> {
    try {
      const supabase = this.getClient();
      const cleanKey = key.replace(/^\/+/, '');
      const pathParts = cleanKey.split('/');
      const fileName = pathParts.pop() || cleanKey;
      const folderPath = pathParts.join('/');

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folderPath, {
          search: fileName,
          limit: 10
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      const match = data.find(item => item.name === fileName);
      if (!match) return null;

      return {
        storageKey: cleanKey,
        storageProvider: 'supabase',
        sizeBytes: match.metadata?.size || 0,
        mimeType: match.metadata?.mimetype || 'application/octet-stream',
        lastModified: match.updated_at || match.created_at
      };
    } catch {
      return null;
    }
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 900,
    downloadFilename?: string
  ): Promise<string | null> {
    try {
      const supabase = this.getClient();
      const cleanKey = key.replace(/^\/+/, '');
      const options: { download?: string | boolean } = {};
      if (downloadFilename) {
        options.download = downloadFilename;
      }

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(cleanKey, expiresInSeconds, options);

      if (error || !data?.signedUrl) {
        return null;
      }
      return data.signedUrl;
    } catch (err: any) {
      console.error('[SUPABASE STORAGE] Signed URL creation error:', err.message);
      return null;
    }
  }

  async getStatus(): Promise<StorageDiagnosticStatus> {
    const configured = this.isConfigured();
    const maxMb = Number(process.env.MAX_PRODUCT_FILE_MB) || 100;

    let status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR' = configured ? 'CONNECTED' : 'NOT CONFIGURED';
    let errorMessage: string | undefined;

    if (configured) {
      const test = await this.testConnection();
      if (!test.success) {
        status = 'ERROR';
        errorMessage = test.error;
      }
    }

    return {
      configured,
      status,
      provider: 'Supabase Storage',
      authoritative: 'Private Object Storage',
      providerKey: 'supabase',
      bucket: this.bucketName,
      endpoint: this.supabaseUrl ? new URL(this.supabaseUrl).hostname : undefined,
      maxUploadSizeMB: maxMb,
      error: errorMessage,
      checkedAt: new Date().toISOString()
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Supabase storage is not configured.',
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      };
    }

    try {
      const supabase = this.getClient();
      await this.ensureBucketExists();
      const { data, error } = await supabase.storage.getBucket(this.bucketName);

      if (error) {
        // Try listing buckets
        const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
        if (listErr) {
          return {
            success: false,
            message: `Unable to access Supabase Storage: ${listErr.message}`,
            error: listErr.message
          };
        }
        const found = buckets?.some(b => b.name === this.bucketName);
        if (!found) {
          return {
            success: false,
            message: `Bucket '${this.bucketName}' does not exist on Supabase project.`,
            error: `Bucket '${this.bucketName}' not found`
          };
        }
      }

      return {
        success: true,
        message: `Supabase Storage connected. Private bucket '${this.bucketName}' verified.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Supabase connection verification failed',
        error: err.message
      };
    }
  }
}
