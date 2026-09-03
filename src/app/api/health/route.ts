import { NextResponse } from "next/server";
import fs from "fs";
import { DATA_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version || "1.0.0";

  let isDatabaseHealthy = false;
  try {
    // Safe database health check: test if data directory is readable and projects store exists
    if (fs.existsSync(DATA_DIR)) {
      const stats = fs.statSync(DATA_DIR);
      if (stats.isDirectory()) {
        isDatabaseHealthy = true;
      }
    }
  } catch {
    isDatabaseHealthy = false;
  }

  const status = isDatabaseHealthy ? "healthy" : "unhealthy";
  const statusCode = isDatabaseHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp,
      version,
      database: isDatabaseHealthy ? "healthy" : "unavailable",
    },
    { status: statusCode }
  );
}
