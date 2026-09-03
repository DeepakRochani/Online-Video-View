import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { DATA_DIR, BackupMetadata, recordBackupMetadata, getBackups } from "./db";
import { logger } from "./logger";
import { startJob } from "./job-monitor";

const BACKUPS_DIR = path.join(DATA_DIR, "backups");

/**
 * Creates a point-in-time backup snapshot of all SaaS metadata stores.
 * Note: Wedding media files (photos/videos) remain in Google Drive; only platform state and metadata are archived.
 */
export async function createBackupSnapshot(label?: string): Promise<BackupMetadata> {
  const job = startJob("BACKUP_SNAPSHOT", { label });

  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotName = `backup-${timestamp}${label ? `-${label.replace(/[^a-zA-Z0-9_-]/g, "_")}` : ""}.json`;
    const snapshotPath = path.join(BACKUPS_DIR, snapshotName);

    // Collect all JSON stores in DATA_DIR (excluding backups folder itself)
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json") && f !== "backups.json");
    const snapshotData: Record<string, any> = {
      _meta: {
        createdAt: new Date().toISOString(),
        version: "1.0.0",
        label: label || "scheduled",
        system: "drfilms-saas",
      },
      stores: {},
    };

    let totalRecords = 0;
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
        snapshotData.stores[file] = content;
        if (Array.isArray(content)) {
          totalRecords += content.length;
        }
      } catch (err) {
        snapshotData.stores[file] = null;
      }
    }

    const serialized = JSON.stringify(snapshotData, null, 2);
    fs.writeFileSync(snapshotPath, serialized, "utf-8");

    const checksum = crypto.createHash("sha256").update(serialized).digest("hex");
    const stat = fs.statSync(snapshotPath);
    const sizeBytes = stat.size;
    const sizeKb = Number((sizeBytes / 1024).toFixed(2));

    const metadata: BackupMetadata = {
      id: `bkp-${Date.now()}-${uuidv4().slice(0, 8)}`,
      filename: snapshotName,
      filePath: snapshotPath,
      sizeBytes,
      sizeKb,
      storeCount: Object.keys(snapshotData.stores).length,
      recordCount: totalRecords,
      createdAt: new Date().toISOString(),
      checksum,
      status: "COMPLETED",
    };

    recordBackupMetadata(metadata);
    job.finish("COMPLETED", undefined, { backupId: metadata.id, filename: snapshotName, sizeKb, totalRecords });

    logger.info(`Point-in-time backup created successfully: ${metadata.id}`, { backupId: metadata.id, sizeKb, recordCount: totalRecords });
    return metadata;
  } catch (err: any) {
    const errorMsg = err.message || "Backup failed";
    job.finish("FAILED", errorMsg);

    const failedMeta: BackupMetadata = {
      id: `bkp-${Date.now()}-${uuidv4().slice(0, 8)}`,
      filename: "FAILED",
      sizeBytes: 0,
      sizeKb: 0,
      storeCount: 0,
      recordCount: 0,
      createdAt: new Date().toISOString(),
      checksum: "",
      status: "FAILED",
      error: errorMsg,
    };
    recordBackupMetadata(failedMeta);
    logger.error(`Backup creation failed: ${errorMsg}`, err);
    return failedMeta;
  }
}

/**
 * Verifies the cryptographic SHA-256 integrity of a backup snapshot.
 */
export function verifyBackupSnapshot(backupId: string): { valid: boolean; reason?: string; error?: string } {
  const backups = getBackups();
  const target = backups.find((b) => b.id === backupId);
  if (!target) {
    return { valid: false, reason: "NOT_FOUND", error: "Backup record not found in registry" };
  }
  if (target.status === "FAILED") {
    return { valid: false, reason: "BACKUP_FAILED", error: target.error || "Backup is marked as failed" };
  }

  const filePath = target.filePath || path.join(BACKUPS_DIR, target.filename);
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: "FILE_MISSING", error: "Backup snapshot file missing from disk" };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const computedChecksum = crypto.createHash("sha256").update(content).digest("hex");
    if (computedChecksum !== target.checksum) {
      return { valid: false, reason: "CHECKSUM_MISMATCH", error: "Checksum mismatch: Backup may be corrupted or tampered" };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: "READ_ERROR", error: err.message || "Failed to read backup file" };
  }
}

export const verifyBackupIntegrity = verifyBackupSnapshot;

/**
 * Full disaster recovery state restoration from a valid snapshot.
 */
export async function restoreFromBackup(backupId: string): Promise<{ success: boolean; restoredTables: string[]; error?: string }> {
  const backups = getBackups();
  const target = backups.find((b) => b.id === backupId);
  if (!target) {
    return { success: false, restoredTables: [], error: "BACKUP_NOT_FOUND" };
  }

  const verification = verifyBackupSnapshot(backupId);
  if (!verification.valid) {
    return { success: false, restoredTables: [], error: verification.error || verification.reason || "INVALID_BACKUP" };
  }

  const filePath = target.filePath || path.join(BACKUPS_DIR, target.filename);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const snapshotData = JSON.parse(content);
    if (!snapshotData || !snapshotData.stores) {
      return { success: false, restoredTables: [], error: "INVALID_SNAPSHOT_STRUCTURE" };
    }

    const restoredTables: string[] = [];
    for (const [storeFile, storeData] of Object.entries(snapshotData.stores)) {
      if (storeData !== null) {
        const destPath = path.join(DATA_DIR, storeFile);
        fs.writeFileSync(destPath, JSON.stringify(storeData, null, 2), "utf-8");
        restoredTables.push(storeFile);
      }
    }

    logger.info(`Disaster recovery restoration completed from backup: ${backupId}`, { restoredTables: restoredTables.length });
    return { success: true, restoredTables };
  } catch (err: any) {
    logger.error(`Disaster recovery restore failed for backup ${backupId}`, err);
    return { success: false, restoredTables: [], error: err.message || "RESTORE_FAILED" };
  }
}

/**
 * Returns all backup metadata records sorted descending by creation time.
 */
export function listBackups(): BackupMetadata[] {
  const backups = getBackups();
  return [...backups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export { getBackups };
