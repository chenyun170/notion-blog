import { spawn } from "node:child_process";

const target = "http://localhost:4321";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isRunning() {
  try {
    const res = await fetch(target, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isRunning()) return true;
    await sleep(1000);
  }
  return false;
}

function spawnShell(command, options = {}) {
  return spawn(command, {
    stdio: "inherit",
    shell: true,
    ...options,
  });
}

let devServer = null;

if (await isRunning()) {
  console.log(`Reusing existing dev server at ${target}`);
} else {
  console.log("Starting Astro dev server for visual checks...");
  devServer = spawnShell("npm run dev -- --host localhost");
  const ready = await waitForServer();
  if (!ready) {
    if (devServer && !devServer.killed) devServer.kill();
    console.error(`Timed out waiting for ${target}`);
    process.exit(1);
  }
}

const testProcess = spawnShell("npx playwright test");

testProcess.on("exit", (code) => {
  if (devServer && !devServer.killed) devServer.kill();
  process.exit(code ?? 0);
});
