import { NextRequest } from "next/server";
import { handleVideoStream } from "@/lib/video-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  return handleVideoStream(request, videoId);
}
