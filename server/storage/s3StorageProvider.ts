import { Readable } from 'stream';
import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IObjectStorageService,
  StorageProviderType,
  StorageUploadResult,
  StorageDownloadResult,
  StorageFileMetadata
} from './types';
import { StorageDiagnosticStatus } from '../../src/types';

export class S3StorageProvider implements IObjectStorageService {
  readonly providerType: StorageProviderType = 's3';
  private client: S3Client | null = null;
  private readonly endpoint?: string;
  private readonly region: string;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly forcePathStyle: boolean;

  constructor() {
    this.endpoint = process.env.S3_ENDPOINT || undefined;
    this.region = process.env.S3_REGION || 'auto';
    this.bucket = process.env.S3_BUCKET || '';
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';
    this.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
  }

  isConfigured(): boolean {
    return Boolean(this.bucket && this.accessKeyId && this.secretAccessKey);
  }

  private getClient(): S3Client {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new Error(
          'S3 Storage is not fully configured. Missing S3_BUCKET, S3_ACCESS_KEY_ID, or S3_SECRET_ACCESS_KEY.'
        );
      }

      this.client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        forcePathStyle: this.forcePathStyle,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey
        }
      });
    }
    return this.client;
  }

  async uploadPrivateFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageUploadResult> {
    const s3 = this.getClient();
    const cleanKey = key.replace(/^\/+/, '');
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
      Metadata: {
        ...(metadata || {}),
        sha256: checksum
      }
    });

    await s3.send(command);
    const uploadedAt = new Date().toISOString();

    return {
      storageKey: cleanKey,
      storageProvider: 's3',
      fileSizeBytes: buffer.length,
      mimeType: mimeType || 'application/octet-stream',
      checksumSha256: checksum,
      uploadedAt
    };
  }

  async downloadPrivateFile(key: string): Promise<StorageDownloadResult> {
    const s3 = this.getClient();
    const cleanKey = key.replace(/^\/+/, '');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey
    });

    const response = await s3.send(command);
    const stream = response.Body as Readable;

    return {
      stream,
      contentLength: response.ContentLength,
      mimeType: response.ContentType || 'application/octet-stream',
      checksumSha256: response.Metadata?.sha256,
      storageKey: cleanKey
    };
  }

  async deletePrivateFile(key: string): Promise<boolean> {
    try {
      const s3 = this.getClient();
      const cleanKey = key.replace(/^\/+/, '');
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey
      });
      await s3.send(command);
      return true;
    } catch (err: any) {
      console.error(`[S3 STORAGE] Delete error for key ${key}:`, err.message);
      return false;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const s3 = this.getClient();
      const cleanKey = key.replace(/^\/+/, '');
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey
      });
      await s3.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageFileMetadata | null> {
    try {
      const s3 = this.getClient();
      const cleanKey = key.replace(/^\/+/, '');
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey
      });
      const response = await s3.send(command);
      return {
        storageKey: cleanKey,
        storageProvider: 's3',
        sizeBytes: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified?.toISOString(),
        checksumSha256: response.Metadata?.sha256
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
      const s3 = this.getClient();
      const cleanKey = key.replace(/^\/+/, '');

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        ResponseContentDisposition: downloadFilename
          ? `attachment; filename="${downloadFilename.replace(/"/g, '')}"`
          : undefined
      });

      return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    } catch (err: any) {
      console.error('[S3 STORAGE] Signed URL creation error:', err.message);
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
      provider: 'S3-Compatible Storage',
      authoritative: 'Private Object Storage',
      providerKey: 's3',
      bucket: this.bucket,
      endpoint: this.endpoint ? new URL(this.endpoint).hostname : undefined,
      region: this.region,
      maxUploadSizeMB: maxMb,
      error: errorMessage,
      checkedAt: new Date().toISOString()
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'S3 Storage is not configured.',
        error: 'Missing S3_BUCKET, S3_ACCESS_KEY_ID, or S3_SECRET_ACCESS_KEY'
      };
    }

    try {
      const s3 = this.getClient();
      const command = new HeadBucketCommand({ Bucket: this.bucket });
      await s3.send(command);
      return {
        success: true,
        message: `S3 Storage connected. Private bucket '${this.bucket}' verified.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Unable to access S3 Bucket '${this.bucket}'`,
        error: err.message
      };
    }
  }
}
