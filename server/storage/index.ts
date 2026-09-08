import path from 'path';
import crypto from 'crypto';
import {
  IObjectStorageService,
  StorageProviderType,
  StorageUploadResult,
  StorageDownloadResult,
  StorageFileMetadata
} from './types';
import { LocalStorageProvider } from './localStorageProvider';
import { SupabaseStorageProvider } from './supabaseStorageProvider';
import { S3StorageProvider } from './s3StorageProvider';
import { StorageDiagnosticStatus, UploadedFileMetadata } from '../../src/types';

// Dangerous executable & server-side script extensions
const FORBIDDEN_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.vbs', '.js', '.ts', '.mjs',
  '.jar', '.apk', '.bin', '.dll', '.so', '.dylib', '.msi', '.com', '.scr', '.pif',
  '.php', '.php3', '.phtml', '.asp', '.aspx', '.py', '.rb', '.cgi', '.pl', '.jsp',
  '.htm', '.html', '.xhtml'
]);

// Allowed digital product file extensions
const ALLOWED_PRODUCT_EXTENSIONS = new Set([
  '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.txt', '.md',
  '.epub', '.mobi',
  '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav',
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.psd', '.ai', '.fig', '.sketch',
  '.json'
]);

export class StorageService implements IObjectStorageService {
  private localProvider: LocalStorageProvider;
  private supabaseProvider: SupabaseStorageProvider;
  private s3Provider: S3StorageProvider;

  constructor() {
    this.localProvider = new LocalStorageProvider();
    this.supabaseProvider = new SupabaseStorageProvider();
    this.s3Provider = new S3StorageProvider();
  }

  get providerType(): StorageProviderType {
    const configuredProvider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
    if (configuredProvider === 'supabase') return 'supabase';
    if (configuredProvider === 's3') return 's3';
    if (configuredProvider === 'local') return 'local';

    if (this.supabaseProvider.isConfigured()) return 'supabase';
    if (this.s3Provider.isConfigured()) return 's3';

    return 'local';
  }

  getActiveProvider(): IObjectStorageService {
    const type = this.providerType;
    if (type === 'supabase') return this.supabaseProvider;
    if (type === 's3') return this.s3Provider;
    return this.localProvider;
  }

  /**
   * Helper to format file bytes to human readable format
   */
  static formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Calculate SHA-256 Checksum of a Buffer
   */
  static calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Neutralize path traversal, URL-encoding attacks, and sanitize filename
   */
  static sanitizeFilename(rawName: string): string {
    if (!rawName) return 'unnamed-asset.bin';

    // Decode URL encodings (e.g. %2e%2e -> ..) safely
    let decoded = rawName;
    try {
      decoded = decodeURIComponent(rawName);
    } catch {
      decoded = rawName;
    }

    // Strip path traversal sequences, null bytes, backslashes, forward slashes
    let sanitized = path.basename(decoded)
      .replace(/[\x00-\x1F\x7F]/g, '') // remove control characters
      .replace(/[\\\/:\*\?"<>\|]/g, '_') // remove invalid filename chars
      .replace(/^\.+/g, '') // strip leading dots
      .trim();

    if (!sanitized) {
      sanitized = `asset_${Date.now()}.bin`;
    }

    return sanitized;
  }

  /**
   * Generates a structured, unpredictable storage key
   * e.g. products/{productId}/{randomHex}-{sanitizedFilename}
   */
  static generateObjectKey(productId: string, originalFilename: string): string {
    const cleanId = productId.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    const cleanName = StorageService.sanitizeFilename(originalFilename);
    const randomHex = crypto.randomBytes(12).toString('hex');
    return `products/${cleanId}/${randomHex}-${cleanName}`;
  }

  /**
   * Validate digital product file upload
   */
  static validateProductFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file was uploaded' };
    }

    const cleanFilename = StorageService.sanitizeFilename(file.originalname);
    const ext = path.extname(cleanFilename).toLowerCase();

    // Check prohibited executable extensions
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `Executable and script file formats (${ext}) are strictly prohibited for security reasons.`
      };
    }

    // Check allowed extensions
    if (!ALLOWED_PRODUCT_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `File type ${ext} is not supported. Please upload a PDF, EPUB, MOBI, ZIP, DOCX, XLSX, MP4, or standard digital asset format.`
      };
    }

    // Configurable Max upload size (defaults to 100 MB)
    const maxMb = Number(process.env.MAX_PRODUCT_FILE_MB) || 100;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `File size (${StorageService.formatBytes(file.size)}) exceeds the configured maximum limit of ${maxMb} MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Upload a private file buffer to the active storage provider
   */
  async uploadPrivateFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageUploadResult> {
    const isProduction = process.env.NODE_ENV === 'production';
    const activeProvider = this.getActiveProvider();

    if (isProduction && activeProvider.providerType === 'local' && process.env.STORAGE_PROVIDER !== 'local') {
      throw new Error(
        'PRIVATE STORAGE NOT CONFIGURED: Persistent cloud object storage (Supabase / S3) is required for production uploads.'
      );
    }

    return activeProvider.uploadPrivateFile(key, buffer, mimeType, metadata);
  }

  /**
   * Download a private file as a stream or buffer
   */
  async downloadPrivateFile(key: string): Promise<StorageDownloadResult> {
    // If the key exists in the active provider, use that
    const activeProvider = this.getActiveProvider();
    
    try {
      return await activeProvider.downloadPrivateFile(key);
    } catch (err: any) {
      // Fallback: If active provider is cloud but file might still exist on local disk (during migration phase)
      if (activeProvider.providerType !== 'local') {
        const localExists = await this.localProvider.fileExists(key);
        if (localExists) {
          console.log(`[STORAGE] Fallback serving '${key}' from local storage.`);
          return await this.localProvider.downloadPrivateFile(key);
        }
      }
      throw err;
    }
  }

  /**
   * Delete a private file from storage
   */
  async deletePrivateFile(key: string): Promise<boolean> {
    const active = this.getActiveProvider();
    const res = await active.deletePrivateFile(key);
    // Also clean up local if present
    if (active.providerType !== 'local') {
      await this.localProvider.deletePrivateFile(key);
    }
    return res;
  }

  /**
   * Check if a private file exists in storage
   */
  async fileExists(key: string): Promise<boolean> {
    const active = this.getActiveProvider();
    const exists = await active.fileExists(key);
    if (exists) return true;
    if (active.providerType !== 'local') {
      return await this.localProvider.fileExists(key);
    }
    return false;
  }

  /**
   * Retrieve metadata for a stored file
   */
  async getMetadata(key: string): Promise<StorageFileMetadata | null> {
    const active = this.getActiveProvider();
    const meta = await active.getMetadata(key);
    if (meta) return meta;
    if (active.providerType !== 'local') {
      return await this.localProvider.getMetadata(key);
    }
    return null;
  }

  /**
   * Generate a short-lived signed download URL (5-15 mins) if supported
   */
  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 900,
    downloadFilename?: string
  ): Promise<string | null> {
    return this.getActiveProvider().getSignedDownloadUrl(key, expiresInSeconds, downloadFilename);
  }

  /**
   * Get safe operational diagnostic status
   */
  async getStatus(): Promise<StorageDiagnosticStatus> {
    return this.getActiveProvider().getStatus();
  }

  /**
   * Verify real provider connectivity
   */
  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    return this.getActiveProvider().testConnection();
  }
}

// Export singleton instance
export const storageService = new StorageService();
export type { IObjectStorageService, StorageProviderType, StorageUploadResult, StorageDownloadResult, StorageFileMetadata };
