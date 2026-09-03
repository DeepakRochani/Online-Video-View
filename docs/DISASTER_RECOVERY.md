# Disaster Recovery & Production Backup Protocol

## 1. Architectural Overview & Storage Separation

The wedding photography multi-tenant SaaS maintains a strict separation of concerns between raw media storage and application metadata:

1. **Raw Media (High-Resolution Photos & 4K Wedding Videos)**:
   - Resides exclusively in the photographer's connected **Google Drive** folders.
   - The SaaS application **never** duplicates binary media files into the database store or backup archives.
   - Preserves cost efficiency, storage isolation, and photographer data ownership.

2. **Application Metadata & Tenant State**:
   - Resides in the application data directory (`process.env.DATA_DIR` or `./data/`).
   - Includes:
     - `photographers.json`: Tenant accounts, credentials, branding, plan overrides.
     - `projects.json`: Wedding metadata, client codes, drive folder IDs, selection locks.
     - `subscriptions.json`: Subscription lifecycle states, grace periods, billing cycles.
     - `invoices.json`: Billing history and payment receipts.
     - `domains.json`: Custom domain mappings and verification status.
     - `audit-logs.json`: Immutable administrative actions.
     - `alerts.json`: Platform alert deduplication records.
     - `errors.json`: Application error fingerprints and occurrence metrics.
     - `jobs.json`: Background processing telemetry.
     - `backups.json`: Snapshot records and SHA-256 verification hashes.

---

## 2. Backup Strategy

### Snapshot Types
1. **Automated Regular Snapshots**:
   - Generated via cron or administrative automation by calling `POST /api/admin/backups`.
   - Bundles all JSON entity stores into a versioned archive (`data/backups/snapshot-{timestamp}.json`).
   - Computes SHA-256 integrity checksum for tamper and corruption detection.

2. **Pre-Migration & Manual Snapshots**:
   - Can be triggered on-demand by Super Admins via the **Diagnostics & Runtime Health** panel (`/admin/system-health`).

---

## 3. Step-by-Step Restoration Procedure

In the event of database corruption, server failure, or accidental administrative deletion:

### Step 1: Isolate the Instance
1. Place the platform in maintenance mode or stop incoming write traffic.
2. Verify existing data directory state and preserve corrupted data as `data_corrupt_{timestamp}` for forensic analysis:
   ```bash
   cp -r data data_corrupt_$(date +%s)
   ```

### Step 2: Locate the Target Snapshot
1. Inspect `data/backups/backups.json` or target snapshot directory (`data/backups/`).
2. Verify the snapshot SHA-256 checksum:
   ```bash
   # Calculate file hash
   shasum -a 256 data/backups/snapshot-{backupId}.json
   ```
   Compare against `checksum` recorded in `backups.json`.

### Step 3: Execute Restoration
1. Use the programmatic restoration tool in `src/lib/backup.ts`:
   ```typescript
   import { restoreFromBackup } from "@/lib/backup";

   const result = await restoreFromBackup("snapshot-1788363222587");
   if (!result.success) {
     console.error("Restoration failed:", result.error);
   } else {
     console.log(`Restored ${result.restoredTables.length} tables successfully.`);
   }
   ```
2. Or manually extract the snapshot JSON and write the entities back to `data/*.json`.

### Step 4: Post-Restore Verification Checklist
- [ ] Run system diagnostics endpoint: `GET /api/admin/system-health`
- [ ] Verify public health probe: `GET /api/health`
- [ ] Confirm photographer login and session validation
- [ ] Verify gallery access codes and Drive folder stream endpoints
- [ ] Check open platform alerts: `GET /api/admin/alerts`
- [ ] Ensure all 10 JSON store record counts match pre-incident numbers

---

## 4. Google Drive Resilience & Rate-Limit Handling

- **Transient Error Backoff**: All Google Drive API interactions (e.g. folder scanning, streaming) use exponential backoff (`scanDriveFolderWithRetry` in `src/lib/drive.ts`).
- **Quota Management**: 429 and 503 HTTP responses automatically trigger exponential delay with jitter (1000ms, 2000ms, 4000ms).
- **Permanent Error Containment**: 401/403/404 errors halt immediately and trigger structured `PlatformAlert` records with severity `ERROR` or `CRITICAL`.

---

## 5. Incident Response & Escalation

- **Severity Level 1 (CRITICAL)**: Database failure, payment webhook drops > 10, complete gallery outage.
  - Action: Immediate super admin escalation via Alerts dashboard (`/admin/alerts`), check `errors.json` for correlated stack traces using `X-Request-ID`.
- **Severity Level 2 (ERROR)**: Single photographer Google Drive token revoked, failed individual webhook.
  - Action: Photographer prompted to re-authorize Google Drive in settings; webhook retry triggered from `/admin/webhooks`.
- **Severity Level 3 (WARNING)**: High memory usage (> 400MB), delayed background job.
  - Action: Monitor diagnostic metrics on `/admin/system-health`.
