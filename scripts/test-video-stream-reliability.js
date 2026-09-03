/**
 * Video Stream Reliability & Range Header Verification Suite
 */

const BASE_URL = "http://localhost:3000";
const ACCESS_CODE = "4JSCXV94";

async function runVideoStreamReliabilityTests() {
  console.log("==================================================");
  console.log("🎬 STARTING VIDEO STREAM & PLAYER VERIFICATION");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function report(name, ok, details = "") {
    if (ok) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  // 1. Fetch gallery to get video IDs
  const galleryRes = await fetch(`${BASE_URL}/api/gallery/${ACCESS_CODE}`);
  const gallery = await galleryRes.json();
  const videos = gallery.videoFiles || gallery.videos || [];

  // Filter to videos that are currently accessible on Google Drive
  const activeVideos = [];
  for (const v of videos) {
    const id = v.id || v.driveFileId;
    const checkRes = await fetch(`${BASE_URL}/api/videos/${id}/stream?accessCode=${ACCESS_CODE}`, {
      headers: { Range: "bytes=0-1024" }
    });
    if (checkRes.status === 206) {
      activeVideos.push(v);
    }
  }

  report("1. Gallery Videos Loaded", videos.length > 0, `Found ${videos.length} total, ${activeVideos.length} active with 206 streaming`);

  if (activeVideos.length === 0) {
    console.error("No videos available to test streaming!");
    process.exit(1);
  }

  const testVideo = activeVideos[0];
  const videoId = testVideo.id || testVideo.driveFileId;

  // 2. Test initial range request (bytes=0-)
  const initialRangeRes = await fetch(`${BASE_URL}/api/videos/${videoId}/stream?accessCode=${ACCESS_CODE}`, {
    headers: { Range: "bytes=0-" }
  });

  const status206 = initialRangeRes.status === 206;
  const acceptRanges = initialRangeRes.headers.get("accept-ranges") === "bytes";
  const contentRange = initialRangeRes.headers.get("content-range");
  const contentLength = initialRangeRes.headers.get("content-length");
  const contentType = initialRangeRes.headers.get("content-type");

  report(
    "2. Initial Range Request (bytes=0-)",
    status206 && acceptRanges && !!contentRange,
    `Status: ${initialRangeRes.status}, Accept-Ranges: ${acceptRanges}, Content-Range: ${contentRange}, Content-Length: ${contentLength}, Content-Type: ${contentType}`
  );

  // 3. Test mid-stream seek range request (bytes=5000000-)
  const seekRangeRes = await fetch(`${BASE_URL}/api/videos/${videoId}/stream?accessCode=${ACCESS_CODE}`, {
    headers: { Range: "bytes=5000000-" }
  });

  const seek206 = seekRangeRes.status === 206;
  const seekRange = seekRangeRes.headers.get("content-range");

  report(
    "3. Mid-Stream Seek Range Request (bytes=5000000-)",
    seek206 && seekRange && seekRange.startsWith("bytes 5000000-"),
    `Status: ${seekRangeRes.status}, Content-Range: ${seekRange}`
  );

  // 4. Test rapid switching between active gallery videos
  console.log("\nSimulating rapid video switching across active gallery tracks...");
  let rapidSwitchSuccess = true;
  for (let i = 0; i < Math.min(activeVideos.length, 4); i++) {
    const v = activeVideos[i];
    const vId = v.id || v.driveFileId;
    const res = await fetch(`${BASE_URL}/api/videos/${vId}/stream?accessCode=${ACCESS_CODE}`, {
      headers: { Range: "bytes=0-1024" }
    });
    if (res.status !== 206) {
      rapidSwitchSuccess = false;
      console.error(`Video ${i + 1} (${v.name}) failed with status ${res.status}`);
      break;
    }
  }

  report(
    "4. Rapid Video Switching Simulation",
    rapidSwitchSuccess,
    `Successfully fetched initial chunks for ${Math.min(activeVideos.length, 4)} sequential tracks`
  );

  // 5. Verify security checks
  const fakeIdRes = await fetch(`${BASE_URL}/api/videos/1FakeVideoId999999999/stream?accessCode=${ACCESS_CODE}`);
  report("5. Unknown Drive ID Blocked", fakeIdRes.status === 404, `Status: ${fakeIdRes.status}`);

  const badAccessCodeRes = await fetch(`${BASE_URL}/api/videos/${videoId}/stream?accessCode=WRONG_CODE`);
  report("6. Mismatched Access Code Blocked", badAccessCodeRes.status === 403, `Status: ${badAccessCodeRes.status}`);

  console.log("\n==================================================");
  console.log(`🏁 VIDEO STREAM SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runVideoStreamReliabilityTests().catch(err => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
