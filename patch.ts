import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, cpSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const APP_PATH = "/Applications/QClaw.app";
const ASAR_PATH = join(APP_PATH, "Contents/Resources/app.asar");

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
  const pattern = /(const \w+=Z\()!1(\),\s*\w+=async \w+=>\{var \w+,\w+,\w+;\s*if\(\w+\.value\)\{await \w+\(\);return\})/;
  const patchedCheck = /(const \w+=Z\()!0(\),\s*\w+=async \w+=>\{var \w+,\w+,\w+;\s*if\(\w+\.value\)\{await \w+\(\);return\})/;

  if (patchedCheck.test(code)) {
    console.log("==> Already patched, skipping");
  } else if (pattern.test(code)) {
    code = code.replace(pattern, "$1!0$2");
    writeFileSync(targetFile, code);
    console.log("==> Patched: inviteVerified default set to true");
  } else {
    console.error(`ERROR: Patch pattern not found in ${basename(targetFile)}`);
    console.error("       The app version may have changed. Manual inspection needed.");
    process.exit(1);
  }

  console.log("==> Repacking app.asar...");
  execSync(`npx --yes @electron/asar pack "${join(workDir, "app")}" "${join(workDir, "app-patched.asar")}"`, { stdio: "inherit" });

  console.log("==> Backing up original app.asar...");
  cpSync(ASAR_PATH, `${ASAR_PATH}.bak`);

  console.log("==> Replacing with patched app.asar...");
  cpSync(join(workDir, "app-patched.asar"), ASAR_PATH);

  console.log(`==> Done! Backup saved at: ${ASAR_PATH}.bak`);

  if (wasRunning) {
    console.log("==> Restarting QClaw...");
    execSync(`open "${APP_PATH}"`);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
