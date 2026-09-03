import fs from "fs";
import path from "path";

try {
  const envFile = fs.readFileSync(path.resolve(".env.local"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
} catch (e) {
  console.log("No .env.local found or error reading it");
}

import { scanDriveFolder, getDriveClient } from "../src/lib/drive";

async function main() {
  const folderId = "13Kho6u93_s1mtJnjMXwXgwMTzivbIRXq";
  console.log("Testing folder scan for ID:", folderId);
  
  const auth = getDriveClient();
  console.log("Auth client result:", "error" in auth ? auth : { authType: auth.authType });
  
  const result = await scanDriveFolder(folderId);
  console.log("Scan result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
