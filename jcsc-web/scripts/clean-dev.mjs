import { existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const CACHE_PATHS = [".next", "node_modules/.cache"];

for (const path of CACHE_PATHS) {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
      console.log(`Removed ${path}`);
    }
  } catch (err) {
    console.warn(`Could not remove ${path}:`, err instanceof Error ? err.message : err);
  }
}

if (process.platform === "win32") {
  const freePort = (port) => {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const pids = new Set();
      for (const line of out.split("\n")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          console.log(`Stopped process ${pid} on port ${port}`);
        } catch {
          // process may have already exited
        }
      }
    } catch {
      // port already free
    }
  };

  for (const port of [3000, 3001, 3002]) freePort(port);
  console.log("Freed ports 3000–3002");
} else {
  try {
    execSync('lsof -ti:3000,3001,3002 | xargs -r kill -9', { stdio: "inherit" });
  } catch {
    // ports may already be free
  }
}

console.log("Cache cleared — safe to start dev server");
