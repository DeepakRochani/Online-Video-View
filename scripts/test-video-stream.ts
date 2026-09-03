import { NextRequest } from "next/server";
import { handleVideoStream } from "../src/lib/video-stream";

async function runTests() {
  const videoId = "1xwW9FiwkhLerCyGv7F-6eR4Ei8g_ci6W"; // Bride Maids and Family.mp4

  console.log("=== TEST 1: Full Content Request (No Range Header) ===");
  const req1 = new NextRequest(`http://localhost:3000/api/videos/${videoId}/stream`);
  const res1 = await handleVideoStream(req1, videoId);
  console.log("Status:", res1.status);
  console.log("Content-Type:", res1.headers.get("content-type"));
  console.log("Accept-Ranges:", res1.headers.get("accept-ranges"));
  console.log("Content-Length:", res1.headers.get("content-length"));
  console.log("Content-Range:", res1.headers.get("content-range"));

  console.log("\n=== TEST 2: Range Request bytes=0-999999 ===");
  const req2 = new NextRequest(`http://localhost:3000/api/videos/${videoId}/stream`, {
    headers: { Range: "bytes=0-999999" },
  });
  const res2 = await handleVideoStream(req2, videoId);
  console.log("Status:", res2.status);
  console.log("Content-Type:", res2.headers.get("content-type"));
  console.log("Accept-Ranges:", res2.headers.get("accept-ranges"));
  console.log("Content-Length:", res2.headers.get("content-length"));
  console.log("Content-Range:", res2.headers.get("content-range"));

  console.log("\n=== TEST 3: Range Request bytes=1000000-1999999 (Seeking Test) ===");
  const req3 = new NextRequest(`http://localhost:3000/api/videos/${videoId}/stream`, {
    headers: { Range: "bytes=1000000-1999999" },
  });
  const res3 = await handleVideoStream(req3, videoId);
  console.log("Status:", res3.status);
  console.log("Content-Type:", res3.headers.get("content-type"));
  console.log("Accept-Ranges:", res3.headers.get("accept-ranges"));
  console.log("Content-Length:", res3.headers.get("content-length"));
  console.log("Content-Range:", res3.headers.get("content-range"));

  console.log("\n=== TEST 4: Large Video Test (10.8 GB Groom Rituals) ===");
  const largeVideoId = "1QOF663dzFsjv69RjJhGCIQzXSKQn8Lmx";
  const req4 = new NextRequest(`http://localhost:3000/api/videos/${largeVideoId}/stream`, {
    headers: { Range: "bytes=0-500000" },
  });
  const res4 = await handleVideoStream(req4, largeVideoId);
  console.log("Status:", res4.status);
  console.log("Content-Range:", res4.headers.get("content-range"));
  console.log("Content-Length:", res4.headers.get("content-length"));
}

runTests().catch(console.error);
