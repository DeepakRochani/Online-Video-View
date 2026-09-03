import { v4 as uuidv4 } from "uuid";
import {
  BackgroundJobRecord,
  JobStatus,
  createOrUpdateJobRecord,
  getJobRecords,
  getJobRecordById,
} from "./db";
import { logger } from "./logger";
import { trackError } from "./error-tracker";

/**
 * Starts tracking a background job execution.
 */
/**
 * Starts tracking a background job execution.
 */
export function startJob(
  name: string,
  arg2?: ((job: any) => Promise<any>) | Record<string, any>,
  options?: Record<string, any>
): any {
  if (typeof arg2 === "function") {
    const jobId = `job-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const startTime = Date.now();
    const startedAt = new Date(startTime).toISOString();
    const metadata = options || {};

    const initialRecord: BackgroundJobRecord = {
      id: jobId,
      name,
      jobType: name,
      status: "RUNNING",
      startedAt,
      attempts: 1,
      maxAttempts: 3,
      metadata,
    };

    createOrUpdateJobRecord(initialRecord);
    logger.info(`[JOB_START] ${name}`, { jobId, metadata });

    const jobHelper: any = {
      jobId,
      processedItems: 0,
      totalItems: 0,
    };

    return (async () => {
      try {
        const result = await arg2(jobHelper);
        const durationMs = Date.now() - startTime;
        const completedAt = new Date().toISOString();

        const updatedRecord: BackgroundJobRecord = {
          ...initialRecord,
          status: "COMPLETED",
          completedAt,
          durationMs,
          processedItems: jobHelper.processedItems,
          totalItems: jobHelper.totalItems,
          metadata: { ...metadata, result },
        };

        createOrUpdateJobRecord(updatedRecord);
        logger.info(`[JOB_COMPLETED] ${name} in ${durationMs}ms`, { jobId, metadata: updatedRecord.metadata });
        return updatedRecord;
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const completedAt = new Date().toISOString();
        const errorMsg = err?.message || String(err);

        const failedRecord: BackgroundJobRecord = {
          ...initialRecord,
          status: "FAILED",
          completedAt,
          durationMs,
          error: errorMsg,
          metadata,
        };

        createOrUpdateJobRecord(failedRecord);
        logger.error(`[JOB_FAILED] ${name} after ${durationMs}ms`, { jobId, error: errorMsg });
        trackError({
          error: err,
          severity: "ERROR",
          source: "BACKGROUND_JOB",
          metadata: { jobId, name, durationMs },
        });
        throw err;
      }
    })();
  }

  const metadata = arg2 as Record<string, any> | undefined;
  const jobId = `job-${Date.now()}-${uuidv4().slice(0, 8)}`;
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();

  const initialRecord: BackgroundJobRecord = {
    id: jobId,
    name,
    jobType: name,
    status: "RUNNING",
    startedAt,
    attempts: 1,
    maxAttempts: 3,
    metadata,
  };

  createOrUpdateJobRecord(initialRecord);
  logger.info(`[JOB_START] ${name}`, { jobId, metadata });

  return {
    jobId,
    finish: (status: "COMPLETED" | "FAILED", error?: string, finalMetadata?: Record<string, any>) => {
      const durationMs = Date.now() - startTime;
      const completedAt = new Date().toISOString();

      const updatedRecord: BackgroundJobRecord = {
        ...initialRecord,
        status,
        completedAt,
        durationMs,
        error,
        metadata: { ...metadata, ...finalMetadata },
      };

      createOrUpdateJobRecord(updatedRecord);

      if (status === "FAILED") {
        logger.error(`[JOB_FAILED] ${name} after ${durationMs}ms`, {
          jobId,
          error,
          metadata: finalMetadata,
        });
        trackError({
          error: error || `Background job ${name} failed`,
          severity: "ERROR",
          source: "BACKGROUND_JOB",
          metadata: { jobId, name, durationMs, ...finalMetadata },
        });
      } else {
        logger.info(`[JOB_COMPLETED] ${name} in ${durationMs}ms`, {
          jobId,
          metadata: finalMetadata,
        });
      }

      return updatedRecord;
    },
  };
}

export {
  getJobRecords,
  getJobRecords as getBackgroundJobs,
  getJobRecordById,
};
