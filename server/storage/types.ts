import { Readable } from 'stream';
import { StorageDiagnosticStatus } from '../../src/types';

export type StorageProviderType = 'local' | 'supabase' | 's3';

export interface StorageUploadResult {
  storageKey: string;
  storageProvider: StorageProviderType;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
  uploadedAt: string;
}

export interface StorageDownloadResult {
  stream?: Readable;
  buffer?: Buffer;
  contentLength?: number;
  mimeType?: string;
  checksumSha256?: string;
  storageKey: string;
}

export interface StorageFileMetadata {
  storageKey: string;
  storageProvider: StorageProviderType;
  sizeBytes: number;
  mimeType: string;
  lastModified?: string;
  checksumSha256?: string;
}

export interface IObjectStorageService {
  readonly providerType: StorageProviderType;

  /**
   * Upload a private file buffer to the storage provider
   */
  uploadPrivateFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageUploadResult>;

  /**
   * Download a private file as a stream or buffer
   */
  downloadPrivateFile(key: string): Promise<StorageDownloadResult>;

  /**
   * Delete a private file from storage
   */
  deletePrivateFile(key: string): Promise<boolean>;

  /**
   * Check if a private file exists in storage
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Retrieve metadata for a stored file
   */
  getMetadata(key: string): Promise<StorageFileMetadata | null>;

  /**
   * Generate a short-lived signed download URL (5-15 mins) if supported by provider
   */
  getSignedDownloadUrl(
    key: string,
    expiresInSeconds?: number,
    downloadFilename?: string
  ): Promise<string | null>;

  /**
   * Get safe operational diagnostic status (never leaks secrets)
   */
  getStatus(): Promise<StorageDiagnosticStatus>;

  /**
   * Verify real provider connectivity
   */
  testConnection(): Promise<{ success: boolean; message: string; error?: string }>;
}
