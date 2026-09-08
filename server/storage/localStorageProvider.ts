import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { Readable } from 'stream';
import {
  IObjectStorageService,
  StorageProviderType,
  StorageUploadResult,
  StorageDownloadResult,
  StorageFileMetadata
} from './types';
import { StorageDiagnosticStatus } from '../../src/types';

export class LocalStorageProvider implements IObjectStorageService {
  readonly providerType: StorageProviderType = 'local';
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    const runtimeStorageRoot = process.env.VERCEL === '1'
      ? path.join(os.tmpdir(), 'ngalung-atelier-storage')
      : path.join(process.cwd(), 'storage');

    this.baseDir = baseDir || path.join(runtimeStorageRoot, 'private_products');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Safely resolves a storage key to a local filesystem path, neutralizing path traversal
   */
  private resolveSafePath(key: string): string {
    // Strip leading slashes, path traversal sequences, and normalize
    const sanitizedKey = key
      .replace(/^(\.\.[\/\\])+/g, '')
      .replace(/[\/\\]\.\.[\/\\]/g, '/')
      .replace(/^\/+/, '');

    const resolved = path.resolve(this.baseDir, sanitizedKey);
    const relative = path.relative(this.baseDir, resolved);

    // Prevent escaping base directory
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      const fallbackName = path.basename(sanitizedKey);
      return path.join(this.baseDir, fallbackName);
    }

    return resolved;
  }

  async uploadPrivateFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageUploadResult> {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && process.env.STORAGE_PROVIDER !== 'local') {
      console.warn('[STORAGE WARNING] Writing private product file to local container disk in production mode.');
    }

    const safePath = this.resolveSafePath(key);
    const parentDir = path.dirname(safePath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(safePath, buffer);

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const uploadedAt = new Date().toISOString();

    return {
      storageKey: key,
      storageProvider: 'local',
      fileSizeBytes: buffer.length,
      mimeType: mimeType || 'application/octet-stream',
      checksumSha256: checksum,
      uploadedAt
    };
  }

  async downloadPrivateFile(key: string): Promise<StorageDownloadResult> {
    const safePath = this.resolveSafePath(key);

    if (!fs.existsSync(safePath)) {
      // Also check fallback to basename if key was stored with relative path prefix
      const fallbackPath = path.join(this.baseDir, path.basename(key));
      if (fs.existsSync(fallbackPath)) {
        const stat = await fs.promises.stat(fallbackPath);
        const stream = fs.createReadStream(fallbackPath);
        return {
          stream,
          contentLength: stat.size,
          storageKey: key
        };
      }
      throw new Error(`Private digital product asset not found in storage: ${path.basename(key)}`);
    }

    const stat = await fs.promises.stat(safePath);
    const stream = fs.createReadStream(safePath);

    return {
      stream,
      contentLength: stat.size,
      storageKey: key
    };
  }

  async deletePrivateFile(key: string): Promise<boolean> {
    try {
      const safePath = this.resolveSafePath(key);
      if (fs.existsSync(safePath)) {
        await fs.promises.unlink(safePath);
        return true;
      }
      const fallbackPath = path.join(this.baseDir, path.basename(key));
      if (fs.existsSync(fallbackPath)) {
        await fs.promises.unlink(fallbackPath);
        return true;
      }
    } catch (err) {
      console.error(`[STORAGE] Error deleting local file (${key}):`, err);
    }
    return false;
  }

  async fileExists(key: string): Promise<boolean> {
    const safePath = this.resolveSafePath(key);
    if (fs.existsSync(safePath)) return true;
    const fallbackPath = path.join(this.baseDir, path.basename(key));
    return fs.existsSync(fallbackPath);
  }

  async getMetadata(key: string): Promise<StorageFileMetadata | null> {
    const safePath = this.resolveSafePath(key);
    let targetPath = safePath;

    if (!fs.existsSync(targetPath)) {
      targetPath = path.join(this.baseDir, path.basename(key));
      if (!fs.existsSync(targetPath)) {
        return null;
      }
    }

    const stat = await fs.promises.stat(targetPath);
    return {
      storageKey: key,
      storageProvider: 'local',
      sizeBytes: stat.size,
      mimeType: 'application/octet-stream',
      lastModified: stat.mtime.toISOString()
    };
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 900,
    downloadFilename?: string
  ): Promise<string | null> {
    // Local filesystem does not produce remote signed URLs
    return null;
  }

  async getStatus(): Promise<StorageDiagnosticStatus> {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxMb = Number(process.env.MAX_PRODUCT_FILE_MB) || 100;

    return {
      configured: !isProduction,
      status: isProduction ? 'NOT CONFIGURED' : 'LOCAL DEVELOPMENT',
      provider: 'Local Disk (Dev Mode)',
      authoritative: 'Local Disk',
      providerKey: 'local',
      maxUploadSizeMB: maxMb,
      error: isProduction
        ? 'Ephemeral container disk is active. Cloud object storage (Supabase or S3) is required for persistent production assets.'
        : undefined,
      checkedAt: new Date().toISOString()
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const testFile = path.join(this.baseDir, `.health_${Date.now()}`);
      await fs.promises.writeFile(testFile, 'ok');
      await fs.promises.unlink(testFile);
      return {
        success: true,
        message: 'Local filesystem storage root is writable.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Local filesystem storage root is not writable.',
        error: err.message
      };
    }
  }
}
