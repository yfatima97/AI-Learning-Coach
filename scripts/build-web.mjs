// Builds the Angular frontend into frontend/dist so the API can serve it (Phase 14).
// On CI (GitHub Actions sets CI=true) it then deletes frontend/node_modules, which is
// only needed for the build, so the upload to Azure stays small and fast.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit", cwd: "frontend" });
run(process.env.CI ? "npm ci" : "npm install");
run("npx ng build");
if (process.env.CI) rmSync("frontend/node_modules", { recursive: true, force: true });
