import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { storageService, StorageService } from './index';
import { store as localStore } from '../dataStore';
import { isPostgresConfigured, postgresStore, checkDatabaseConnection } from '../db';
import { Product } from '../../src/types';

// Load environment variables
dotenv.config();

export interface MigrationSummary {
  dryRun: boolean;
  totalProducts: number;
  productsWithFileAsset: number;
  filesDiscovered: number;
  productsMatched: number;
  filesReadyToMigrate: number;
  alreadyMigrated: number;
  missingLocalFiles: number;
  migratedSuccessfully: number;
  errors: Array<{ productId: string; file: string; error: string }>;
  targetProvider: string;
}

export async function runStorageMigration(options: { dryRun?: boolean } = {}): Promise<MigrationSummary> {
  const isDryRun = options.dryRun ?? process.argv.includes('--dry-run');
  const targetProvider = storageService.providerType;
  const privateDir = path.join(process.cwd(), 'storage', 'private_products');

  console.log('==================================================');
  console.log('THE NGALUNG ATELIER — DIGITAL ASSET STORAGE MIGRATION');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulation Only)' : 'LIVE MIGRATION'}`);
  console.log(`Active Target Provider: ${targetProvider.toUpperCase()}`);
  console.log('==================================================\n');

  let store: any;
  if (isPostgresConfigured()) {
    const dbCheck = await checkDatabaseConnection();
    if (dbCheck.status === 'CONNECTED') {
      console.log('[DATASTORE] Using authoritative PostgreSQL store for metadata updates.');
      store = postgresStore;
    } else {
      console.log('[DATASTORE] PostgreSQL not reachable. Using local JSON store.');
      store = localStore;
    }
  } else {
    console.log('[DATASTORE] Using local JSON datastore.');
    store = localStore;
  }

  const products: Product[] = typeof store.getProducts === 'function'
    ? await store.getProducts()
    : store.getProducts();

  const summary: MigrationSummary = {
    dryRun: isDryRun,
    totalProducts: products.length,
    productsWithFileAsset: 0,
    filesDiscovered: 0,
    productsMatched: 0,
    filesReadyToMigrate: 0,
    alreadyMigrated: 0,
    missingLocalFiles: 0,
    migratedSuccessfully: 0,
    errors: [],
    targetProvider
  };

  // 1. Scan local private directory
  let localFiles: string[] = [];
  if (fs.existsSync(privateDir)) {
    const readRecursive = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(readRecursive(full));
        } else {
          results.push(path.relative(privateDir, full));
        }
      }
      return results;
    };
    localFiles = readRecursive(privateDir);
    summary.filesDiscovered = localFiles.length;
    console.log(`Found ${localFiles.length} file(s) on local disk in '${privateDir}'.`);
  } else {
    console.log(`Private products directory not found: ${privateDir}`);
  }

  // 2. Iterate through products with digital asset files
  for (const product of products) {
    const asset = product.digitalAsset;
    if (!asset || asset.type !== 'file_download') {
      continue;
    }

    summary.productsWithFileAsset++;
    const key = asset.storageKey || asset.fileId || asset.fileName;
    if (!key) {
      continue;
    }

    // Check if already in cloud storage with matching provider
    if (asset.storageProvider === targetProvider && targetProvider !== 'local' && asset.checksumSha256) {
      summary.alreadyMigrated++;
      console.log(`[SKIP] Product '${product.title}' (${product.id}) is already recorded with provider '${targetProvider}'.`);
      continue;
    }

    // Search for local file on disk
    let localPath: string | null = null;
    const directPath = path.join(privateDir, key);
    const basenamePath = path.join(privateDir, path.basename(key));

    if (fs.existsSync(directPath)) {
      localPath = directPath;
    } else if (fs.existsSync(basenamePath)) {
      localPath = basenamePath;
    } else if (asset.fileName && fs.existsSync(path.join(privateDir, asset.fileName))) {
      localPath = path.join(privateDir, asset.fileName);
    }

    if (!localPath) {
      summary.missingLocalFiles++;
      console.log(`[MISSING LOCAL FILE] Product '${product.title}' (${product.id}) references '${key}', but file was not found in '${privateDir}'.`);
      continue;
    }

    summary.productsMatched++;
    const fileBuffer = fs.readFileSync(localPath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const sanitizedName = StorageService.sanitizeFilename(asset.fileName || path.basename(localPath));
    const targetKey = asset.storageKey && asset.storageKey.includes('/')
      ? asset.storageKey
      : StorageService.generateObjectKey(product.id, sanitizedName);

    console.log(`\n[READY] Product: "${product.title}" (${product.id})`);
    console.log(`  Source File:    ${path.basename(localPath)} (${StorageService.formatBytes(fileBuffer.length)})`);
    console.log(`  SHA-256:        ${checksum}`);
    console.log(`  Target Key:     ${targetKey}`);
    console.log(`  Target Provider:${targetProvider}`);

    summary.filesReadyToMigrate++;

    if (!isDryRun) {
      try {
        console.log(`  -> Uploading to ${targetProvider}...`);
        const uploadResult = await storageService.uploadPrivateFile(
          targetKey,
          fileBuffer,
          asset.mimeType || 'application/octet-stream',
          {
            productId: product.id,
            originalName: sanitizedName
          }
        );

        // Update product metadata in datastore
        const updatedAsset = {
          ...asset,
          fileName: sanitizedName,
          originalFilename: sanitizedName,
          fileSize: StorageService.formatBytes(fileBuffer.length),
          fileSizeBytes: fileBuffer.length,
          storageKey: uploadResult.storageKey,
          storageProvider: uploadResult.storageProvider,
          checksumSha256: uploadResult.checksumSha256,
          uploadedAt: uploadResult.uploadedAt
        };

        const updatedProduct: Product = {
          ...product,
          digitalAsset: updatedAsset,
          updatedAt: new Date().toISOString()
        };

        if (typeof store.saveProduct === 'function') {
          await store.saveProduct(updatedProduct);
        }

        summary.migratedSuccessfully++;
        console.log(`  ✓ Successfully migrated and updated metadata.`);
      } catch (err: any) {
        console.error(`  ✗ Migration failed for product ${product.id}:`, err.message);
        summary.errors.push({
          productId: product.id,
          file: localPath,
          error: err.message
        });
      }
    }
  }

  console.log('\n==================================================');
  console.log('MIGRATION SUMMARY');
  console.log('==================================================');
  console.log(`Mode:                     ${isDryRun ? 'DRY-RUN (No changes applied)' : 'LIVE EXECUTION'}`);
  console.log(`Target Provider:          ${targetProvider}`);
  console.log(`Total Products in Store:  ${summary.totalProducts}`);
  console.log(`Digital File Products:    ${summary.productsWithFileAsset}`);
  console.log(`Local Files Discovered:   ${summary.filesDiscovered}`);
  console.log(`Products Matched:         ${summary.productsMatched}`);
  console.log(`Files Ready To Migrate:   ${summary.filesReadyToMigrate}`);
  console.log(`Already Migrated:         ${summary.alreadyMigrated}`);
  console.log(`Missing Local Files:      ${summary.missingLocalFiles}`);
  if (!isDryRun) {
    console.log(`Successfully Migrated:    ${summary.migratedSuccessfully}`);
    console.log(`Errors Encountered:       ${summary.errors.length}`);
  }
  console.log('--------------------------------------------------');
  if (isDryRun) {
    console.log('Dry-run completed. To execute live migration, run without --dry-run.');
  } else {
    console.log('Live migration execution finished.');
  }

  return summary;
}

// Direct execution from CLI
if (process.argv[1] && (process.argv[1].endsWith('migrateStorage.ts') || process.argv[1].endsWith('migrateStorage.js'))) {
  const isDryRun = process.argv.includes('--dry-run');
  runStorageMigration({ dryRun: isDryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATION FATAL ERROR]:', err);
      process.exit(1);
    });
}
