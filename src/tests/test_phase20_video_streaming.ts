import { handleVideoStream } from "../lib/video-stream";
import { NextRequest } from "next/server";

function assert(condition: boolean, message: string, detail?: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}${detail ? ` -> ${detail}` : ""}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

export async function runVideoStreamingTests() {
  console.log("\n=======================================================");
  console.log("🧪 PHASE 20: GOOGLE DRIVE VIDEO STREAMING & RANGE SUITE");
  console.log("=======================================================\n");

  const brideRitualsId = "1tevuDirUgTspjcAC9A9p6Q13Ewz_20ZG";
  const baraatId = "1Ekz5cfVAkPRaIih2nu2tgkHvwUxj3WUd";
  const accessCode = "6GN2C86G";

  // Test 1: Non-existent Video ID returns 404
  console.log("1. Testing Non-existent Video ID -> 404 Not Found");
  const reqNotFound = new NextRequest(`http://localhost:3000/api/videos/non_existent_drive_id_99999/stream?accessCode=${accessCode}`);
  const resNotFound = await handleVideoStream(reqNotFound, "non_existent_drive_id_99999");
  assert(resNotFound.status === 404, "Non-existent video ID returns 404 Not Found", `Status: ${resNotFound.status}`);

  // Test 2: Invalid Access Code returns 403 Forbidden
  console.log("\n2. Testing Cross-Gallery / Invalid Access Code -> 403 Forbidden");
  const reqForbidden = new NextRequest(`http://localhost:3000/api/videos/${brideRitualsId}/stream?accessCode=WRONG_CODE_999`);
  const resForbidden = await handleVideoStream(reqForbidden, brideRitualsId);
  assert(resForbidden.status === 403, "Invalid access code returns 403 Forbidden", `Status: ${resForbidden.status}`);

  // Test 3: Bride Rituals Initial Range Request (Range: bytes=0-) -> 206 Partial Content
  console.log("\n3. Testing 'Bride Rituals' Initial Stream Probe (bytes=0-) -> 206 Partial Content");
  const reqBrideInit = new NextRequest(`http://localhost:3000/api/videos/${brideRitualsId}/stream?accessCode=${accessCode}`, {
    headers: { range: "bytes=0-" },
  });
  const resBrideInit = await handleVideoStream(reqBrideInit, brideRitualsId);
  assert(resBrideInit.status === 206, "Bride Rituals initial probe returns 206 Partial Content", `Status: ${resBrideInit.status}`);
  assert(resBrideInit.headers.get("content-type") === "video/mp4", "Content-Type is video/mp4", `Type: ${resBrideInit.headers.get("content-type")}`);
  assert(resBrideInit.headers.get("accept-ranges") === "bytes", "Accept-Ranges header is bytes");
  const brideContentRange = resBrideInit.headers.get("content-range") || "";
  assert(brideContentRange.startsWith("bytes 0-"), "Content-Range starts at 0", `Range: ${brideContentRange}`);
  assert(brideContentRange.includes("/5381224385"), "Content-Range contains actual total size 5381224385", `Range: ${brideContentRange}`);
  assert(!!resBrideInit.headers.get("cache-control")?.includes("private"), "Cache-Control is private");

  // Test 4: Bride Rituals Subsequent Playback Chunk (Range: bytes=16777216-33554431) -> 206
  console.log("\n4. Testing 'Bride Rituals' Playback Continuation Chunk (Range: bytes=16777216-33554431)");
  const reqBrideCont = new NextRequest(`http://localhost:3000/api/videos/${brideRitualsId}/stream?accessCode=${accessCode}`, {
    headers: { range: "bytes=16777216-33554431" },
  });
  const resBrideCont = await handleVideoStream(reqBrideCont, brideRitualsId);
  assert(resBrideCont.status === 206, "Continuation chunk returns 206 Partial Content", `Status: ${resBrideCont.status}`);
  assert(resBrideCont.headers.get("content-length") === "16777216", "Content-Length matches chunk range 16MB", `Length: ${resBrideCont.headers.get("content-length")}`);

  // Test 5: Baraat Initial Stream Probe (Range: bytes=0-) -> 206 Partial Content
  console.log("\n5. Testing 'Baraat' Initial Stream Probe (bytes=0-) -> 206 Partial Content");
  const reqBaraatInit = new NextRequest(`http://localhost:3000/api/videos/${baraatId}/stream?accessCode=${accessCode}`, {
    headers: { range: "bytes=0-" },
  });
  const resBaraatInit = await handleVideoStream(reqBaraatInit, baraatId);
  assert(resBaraatInit.status === 206, "Baraat initial probe returns 206 Partial Content", `Status: ${resBaraatInit.status}`);
  assert(resBaraatInit.headers.get("content-type") === "video/mp4", "Content-Type is video/mp4");
  const baraatContentRange = resBaraatInit.headers.get("content-range") || "";
  assert(baraatContentRange.startsWith("bytes 0-"), "Baraat Content-Range starts at 0", `Range: ${baraatContentRange}`);
  assert(baraatContentRange.includes("/6457855099"), "Baraat Content-Range contains total size 6457855099", `Range: ${baraatContentRange}`);

  // Test 6: Seeking - Middle Range Request (Range: bytes=524288000-541065215) -> 206
  console.log("\n6. Testing Video Seeking (Range: bytes=524288000-541065215)");
  const reqSeek = new NextRequest(`http://localhost:3000/api/videos/${baraatId}/stream?accessCode=${accessCode}`, {
    headers: { range: "bytes=524288000-541065215" },
  });
  const resSeek = await handleVideoStream(reqSeek, baraatId);
  assert(resSeek.status === 206, "Seek range returns 206 Partial Content", `Status: ${resSeek.status}`);
  assert(!!resSeek.headers.get("content-range")?.startsWith("bytes 524288000-"), "Content-Range matches seek offset");

  // Test 7: Out of Bounds Range Request -> 416 Range Not Satisfiable
  console.log("\n7. Testing Out of Bounds Range Request -> 416 Range Not Satisfiable");
  const reqOutOfBounds = new NextRequest(`http://localhost:3000/api/videos/${brideRitualsId}/stream?accessCode=${accessCode}`, {
    headers: { range: "bytes=999999999999-1000000000000" },
  });
  const resOutOfBounds = await handleVideoStream(reqOutOfBounds, brideRitualsId);
  assert(resOutOfBounds.status === 416, "Out of bounds range returns 416 Range Not Satisfiable", `Status: ${resOutOfBounds.status}`);
  assert(resOutOfBounds.headers.get("content-range") === "bytes */5381224385", "416 Content-Range indicates */totalSize");

  // Test 8: Suffix Range Request (Range: bytes=-1048576, last 1MB of file)
  console.log("\n8. Testing Suffix Range Request (Range: bytes=-1048576)");
  const reqSuffix = new NextRequest(`http://localhost:3000/api/videos/${brideRitualsId}/stream?accessCode=${accessCode}`, {
    headers: { range: "bytes=-1048576" },
  });
  const resSuffix = await handleVideoStream(reqSuffix, brideRitualsId);
  assert(resSuffix.status === 206, "Suffix range returns 206 Partial Content", `Status: ${resSuffix.status}`);

  console.log("\n=======================================================");
  console.log("🎉 ALL 8 VIDEO STREAMING & RANGE TESTS PASSED!");
  console.log("=======================================================\n");
}

if (require.main === module) {
  runVideoStreamingTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
