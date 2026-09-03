import { NextRequest } from "next/server";
import { handleVideoStream } from "@/lib/video-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  return handleVideoStream(request, fileId);
}
