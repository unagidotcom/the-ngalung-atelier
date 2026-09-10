import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { UploadedFileMetadata } from '../src/types';
import { storageService, StorageService } from './storage';

// Dedicated storage directories
const STORAGE_ROOT = process.env.VERCEL === '1'
  ? path.join(os.tmpdir(), 'ngalung-atelier-storage')
  : path.join(process.cwd(), 'storage');
const PRIVATE_FILES_DIR = path.join(STORAGE_ROOT, 'private_products');
const PUBLIC_COVERS_DIR = path.join(STORAGE_ROOT, 'public_covers');

// Ensure root directories exist
[STORAGE_ROOT, PRIVATE_FILES_DIR, PUBLIC_COVERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed image formats for Product Cover
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.svg'
]);

export interface StoredFileResult {
  metadata: UploadedFileMetadata;
  fullPath?: string;
}

export class FileStorageService {
  /**
   * Helper to format file bytes to human readable format
   */
  static formatBytes(bytes: number, decimals = 1): string {
    return StorageService.formatBytes(bytes, decimals);
  }

  /**
   * Calculate SHA-256 Checksum of Buffer
   */
  static calculateSha256(buffer: Buffer): string {
    return StorageService.calculateSha256(buffer);
  }

  /**
   * Sanitize filename and strip path traversal characters
   */
  static sanitizeFilename(name: string): string {
    return StorageService.sanitizeFilename(name);
  }

  /**
   * Validate digital product file upload
   */
  static validateProductFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    return StorageService.validateProductFile(file);
  }

  /**
   * Validate cover image upload
   */
  static validateCoverImage(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No image was selected' };
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `Image format ${ext} is not supported. Please upload a PNG, JPG, JPEG, or WebP image.`
      };
    }

    // Size limit: 10 MB for cover images
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `Image size exceeds the maximum limit of 10 MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Saves a digital product file securely via the storage abstraction service
   */
  static async savePrivateProductFile(
    file: Express.Multer.File,
    productId?: string
  ): Promise<StoredFileResult> {
    const fileId = 'file_' + crypto.randomBytes(8).toString('hex');
    const sanitizedName = StorageService.sanitizeFilename(file.originalname);
    const targetProductId = productId || fileId;
    const storageKey = StorageService.generateObjectKey(targetProductId, sanitizedName);

    const uploadResult = await storageService.uploadPrivateFile(
      storageKey,
      file.buffer,
      file.mimetype || 'application/octet-stream',
      {
        originalName: sanitizedName,
        fileId
      }
    );

    const metadata: UploadedFileMetadata = {
      fileId,
      fileName: sanitizedName,
      originalFilename: sanitizedName,
      fileSize: StorageService.formatBytes(file.size),
      fileSizeBytes: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
      storageKey: uploadResult.storageKey,
      storageProvider: uploadResult.storageProvider,
      checksumSha256: uploadResult.checksumSha256,
      uploadedAt: uploadResult.uploadedAt
    };

    return {
      metadata
    };
  }

  /**
   * Saves a product cover image into public storage
   */
  static async saveCoverImage(file: Express.Multer.File): Promise<{ url: string; fileName: string; storageKey: string; storageProvider: string }> {
    const imageId = 'cover_' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const storageKey = `covers/${imageId}${ext}`;

    const uploadResult = await storageService.uploadPrivateFile(
      storageKey,
      file.buffer,
      file.mimetype || 'application/octet-stream',
      {
        originalName: StorageService.sanitizeFilename(file.originalname),
        assetType: 'coverImage'
      }
    );

    return {
      url: `/api/media/cover/${Buffer.from(uploadResult.storageKey).toString('base64url')}`,
      fileName: file.originalname,
      storageKey: uploadResult.storageKey,
      storageProvider: uploadResult.storageProvider
    };
  }

  /**
   * Retrieves a private file path by storage key (local disk fallback)
   */
  static getPrivateFilePath(storageKey: string): string | null {
    // Sanitize storage key to prevent directory traversal
    const safeKey = storageKey.replace(/^(\.\.[\/\\])+/g, '').replace(/[\/\\]\.\.[\/\\]/g, '/');
    const fullPath = path.join(PRIVATE_FILES_DIR, safeKey);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    const basenamePath = path.join(PRIVATE_FILES_DIR, path.basename(storageKey));
    if (fs.existsSync(basenamePath)) {
      return basenamePath;
    }
    return null;
  }

  /**
   * Deletes a private product file from storage
   */
  static async deletePrivateFile(storageKey?: string): Promise<boolean> {
    if (!storageKey) return false;
    try {
      return await storageService.deletePrivateFile(storageKey);
    } catch (err) {
      console.error('Failed to delete private file from storage:', err);
      return false;
    }
  }

  /**
   * Public covers directory path for static serving
   */
  static getPublicCoversDir(): string {
    return PUBLIC_COVERS_DIR;
  }
}
