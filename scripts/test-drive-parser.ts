import { extractGoogleDriveFolderId, extractGoogleDriveResourceKey, isVideoFile } from "../src/lib/drive-parser";

const testCases = [
  {
    input: "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
    expected: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
    description: "Standard folder URL",
  },
  {
    input: "https://drive.google.com/drive/folders/ABC123XYZ?usp=sharing",
    expected: "ABC123XYZ",
    description: "Folder URL with ?usp=sharing",
  },
  {
    input: "https://drive.google.com/drive/folders/ABC123XYZ?usp=drive_link",
    expected: "ABC123XYZ",
    description: "Folder URL with ?usp=drive_link",
  },
  {
    input: "https://drive.google.com/drive/u/0/folders/1234567890abcdefABCDEF",
    expected: "1234567890abcdefABCDEF",
    description: "Folder URL with user index /u/0/",
  },
  {
    input: "https://drive.google.com/drive/u/2/folders/1234567890abcdefABCDEF?usp=drive_link&resourcekey=0-test12345",
    expected: "1234567890abcdefABCDEF",
    description: "Folder URL with /u/2/, usp, and resourcekey",
  },
  {
    input: "https://drive.google.com/open?id=1234567890abcdefABCDEF",
    expected: "1234567890abcdefABCDEF",
    description: "Open query param id",
  },
  {
    input: "1234567890abcdefABCDEF",
    expected: "1234567890abcdefABCDEF",
    description: "Raw folder ID",
  },
];

console.log("=== RUNNING FOLDER ID EXTRACTION TESTS ===");
let passed = 0;
for (const tc of testCases) {
  const result = extractGoogleDriveFolderId(tc.input);
  if (result === tc.expected) {
    console.log(`✅ [PASS] ${tc.description}: "${result}"`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${tc.description}: expected "${tc.expected}", got "${result}"`);
  }
}

console.log(`\n=== FOLDER ID TESTS SUMMARY: ${passed}/${testCases.length} Passed ===\n`);

console.log("=== RUNNING VIDEO DETECTION TESTS ===");
const videoCases = [
  { file: { name: "highlight.mp4", mimeType: "video/mp4" }, expected: true },
  { file: { name: "ceremony.MOV", mimeType: "video/quicktime" }, expected: true },
  { file: { name: "reception.mkv", mimeType: "application/octet-stream" }, expected: true },
  { file: { name: "speeches.webm", mimeType: "video/webm" }, expected: true },
  { file: { name: "wedding.avi", mimeType: "" }, expected: true },
  { file: { name: "haldi.3gp", mimeType: "video/3gpp" }, expected: true },
  { file: { name: "teaser.m4v", mimeType: "video/x-m4v" }, expected: true },
  { file: { name: "clip.ts", mimeType: "video/mp2t" }, expected: true },
  { file: { name: "photo.jpg", mimeType: "image/jpeg" }, expected: false },
  { file: { name: "contract.pdf", mimeType: "application/pdf" }, expected: false },
  { file: { name: "Engagement", mimeType: "application/vnd.google-apps.folder" }, expected: false },
];

let vPassed = 0;
for (const vc of videoCases) {
  const result = isVideoFile(vc.file);
  if (result === vc.expected) {
    console.log(`✅ [PASS] "${vc.file.name}" (${vc.file.mimeType}): ${result}`);
    vPassed++;
  } else {
    console.error(`❌ [FAIL] "${vc.file.name}" (${vc.file.mimeType}): expected ${vc.expected}, got ${result}`);
  }
}
console.log(`\n=== VIDEO DETECTION TESTS SUMMARY: ${vPassed}/${videoCases.length} Passed ===\n`);

if (passed === testCases.length && vPassed === videoCases.length) {
  process.exit(0);
} else {
  process.exit(1);
}
