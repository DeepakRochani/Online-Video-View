export interface MediaMetrics {
  totalRequests: number;
  imageRequests: number;
  videoRequests: number;
  downloadRequests: number;
  totalBytesProxied: number;
  cacheHits: number;
  cacheMisses: number;
  driveOriginRequests: number;
  errorCount: number;
  startedAt: string;
  lastRequestAt: string | null;
}

const metricsState: MediaMetrics = {
  totalRequests: 0,
  imageRequests: 0,
  videoRequests: 0,
  downloadRequests: 0,
  totalBytesProxied: 0,
  cacheHits: 0,
  cacheMisses: 0,
  driveOriginRequests: 0,
  errorCount: 0,
  startedAt: new Date().toISOString(),
  lastRequestAt: null,
};

export type MediaMetricType = "PHOTO" | "VIDEO" | "DOWNLOAD";

export function recordMediaMetric(
  type: MediaMetricType,
  options: {
    bytes?: number;
    isCacheHit?: boolean;
    isDriveOrigin?: boolean;
    isError?: boolean;
  } = {}
) {
  metricsState.totalRequests++;
  metricsState.lastRequestAt = new Date().toISOString();

  if (type === "PHOTO") {
    metricsState.imageRequests++;
  } else if (type === "VIDEO") {
    metricsState.videoRequests++;
  } else if (type === "DOWNLOAD") {
    metricsState.downloadRequests++;
  }

  if (options.bytes && options.bytes > 0) {
    metricsState.totalBytesProxied += options.bytes;
  }

  if (options.isCacheHit) {
    metricsState.cacheHits++;
  } else {
    metricsState.cacheMisses++;
  }

  if (options.isDriveOrigin) {
    metricsState.driveOriginRequests++;
  }

  if (options.isError) {
    metricsState.errorCount++;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function getMediaMetricsSummary() {
  const hitRate =
    metricsState.totalRequests > 0
      ? ((metricsState.cacheHits / metricsState.totalRequests) * 100).toFixed(1) + "%"
      : "0.0%";

  return {
    ...metricsState,
    formattedBytes: formatBytes(metricsState.totalBytesProxied),
    cacheHitRate: hitRate,
  };
}

export function resetMediaMetricsForTesting() {
  metricsState.totalRequests = 0;
  metricsState.imageRequests = 0;
  metricsState.videoRequests = 0;
  metricsState.downloadRequests = 0;
  metricsState.totalBytesProxied = 0;
  metricsState.cacheHits = 0;
  metricsState.cacheMisses = 0;
  metricsState.driveOriginRequests = 0;
  metricsState.errorCount = 0;
  metricsState.startedAt = new Date().toISOString();
  metricsState.lastRequestAt = null;
}
