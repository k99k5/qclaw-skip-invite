import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, cpSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const APP_PATH = "/Applications/QClaw.app";
const ASAR_PATH = join(APP_PATH, "Contents/Resources/app.asar");

// Check Node version >= 22 (required by @electron/asar)
const nodeVersion = parseInt(process.versions.node.split(".")[0]);
if (nodeVersion < 22) {
  console.error(`ERROR: Node >= 22 required (current: ${process.versions.node}).`);
  process.exit(1);
}

// Check if QClaw is running
let wasRunning = false;
try {
  execSync("pgrep -f QClaw", { stdio: "ignore" });
  wasRunning = true;
  console.log("==> QClaw is running, stopping...");
  try { execSync("pkill -f QClaw"); } catch {}
  execSync("sleep 1");
} catch {}

// Create temp dir with cleanup
const workDir = mkdtempSync(join(tmpdir(), "qclaw-patch-"));
const cleanup = () => rmSync(workDir, { recursive: true, force: true });
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(1); });

try {
  console.log("==> Extracting app.asar...");
  execSync(`npx --yes @electron/asar extract "${ASAR_PATH}" "${join(workDir, "app")}"`, { stdio: "inherit" });

  const assetsDir = join(workDir, "app/out/renderer/assets");
  const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith(".js"));

  // Find target file containing invite logic
  let targetFile = "";
  for (const file of jsFiles) {
    const content = readFileSync(join(assetsDir, file), "utf8");
    if (content.includes("inviteCodeVerified") || content.includes("showInviteCodeModal") || content.includes("is-invite-verified")) {
      targetFile = join(assetsDir, file);
      break;
    }
  }

  if (!targetFile) {
    console.error("ERROR: No JS file containing invite verification logic found");
    process.exit(1);
  }

  console.log(`==> Found: ${basename(targetFile)}`);

  // Patch: set inviteVerified default to true
  let code = readFileSync(targetFile, "utf8");

  // Find the variable name mapped to inviteCodeVerified in the return object
  const retMatch = code.match(/inviteCodeVerified:(\w+)/);
  if (!retMatch) {
    console.error("ERROR: Could not find inviteCodeVerified in return object");
    process.exit(1);
  }
  const varName = retMatch[1];

  // Search backwards from the return to find where varName is initialized as ref(!1)
  const retPos = code.indexOf(retMatch[0]);
  const searchStart = Math.max(0, retPos - 30000);
  const chunk = code.slice(searchStart, retPos);

  const refPattern = new RegExp(
    `((?<![a-zA-Z0-9_$])${varName}=\\w+\\()(!0|!1)(\\))`, "g"
  );
  const matches = [...chunk.matchAll(refPattern)];

  if (matches.length === 0) {
    console.error(`ERROR: Could not find ref initialization for ${varName}`);
    process.exit(1);
  }

  // Use the last match (closest to the return statement)
  const lastMatch = matches[matches.length - 1];
  const matchOffset = searchStart + lastMatch.index!;

  if (lastMatch[2] === "!0") {
    console.log("==> Already patched, skipping");
  } else {
    const patched = lastMatch[1] + "!0" + lastMatch[3];
    code = code.slice(0, matchOffset) + patched + code.slice(matchOffset + lastMatch[0].length);
    writeFileSync(targetFile, code);
    console.log("==> Patched: inviteVerified default set to true");
  }

  console.log("==> Repacking app.asar...");
  execSync(`npx --yes @electron/asar pack "${join(workDir, "app")}" "${join(workDir, "app-patched.asar")}"`, { stdio: "inherit" });

  console.log("==> Replacing app.asar...");
  cpSync(join(workDir, "app-patched.asar"), ASAR_PATH);

  // Disable Electron's asar integrity validation fuse
  const electronBin = join(APP_PATH, "Contents/Frameworks/Electron Framework.framework/Electron Framework");
  const FUSE_SENTINEL = "dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX";
  const FUSE_ASAR_INTEGRITY_INDEX = 4;

  const bin = Buffer.from(readFileSync(electronBin));
  const sentinelPos = bin.indexOf(FUSE_SENTINEL);
  if (sentinelPos === -1) {
    console.error("ERROR: Could not find Electron fuse sentinel");
    process.exit(1);
  }
  // Fuse wire: sentinel(32) + version(1) + count(1) + fuse_bytes(ascii '0'/'1')
  const fuseOffset = sentinelPos + FUSE_SENTINEL.length + 2 + FUSE_ASAR_INTEGRITY_INDEX;
  if (bin[fuseOffset] === 0x31) { // '1' = enabled
    bin[fuseOffset] = 0x30;       // '0' = disabled
    writeFileSync(electronBin, bin);
    console.log("==> Disabled asar integrity validation fuse");
  }

  // Re-sign the app (required after modifying binary/asar)
  console.log("==> Re-signing app...");
  execSync(`codesign --remove-signature "${APP_PATH}"`, { stdio: "inherit" });
  execSync(`codesign --force --deep --sign - "${APP_PATH}"`, { stdio: "inherit" });

  console.log("==> Done!");

  if (wasRunning) {
    console.log("==> Restarting QClaw...");
    execSync(`open "${APP_PATH}"`);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
