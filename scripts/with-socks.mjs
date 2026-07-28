// SOCKS5 proxy wrapper for Node.js
// Usage: node scripts/with-socks.mjs scripts/snapshot-posts.mjs

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { SocksProxyAgent } = require("socks-proxy-agent");

// Patch global https/http agents to use SOCKS5 proxy
import https from "node:https";
import http from "node:http";

const proxyUrl = "socks5://127.0.0.1:10808";
const agent = new SocksProxyAgent(proxyUrl);

https.globalAgent = agent;
http.globalAgent = agent;

// Also patch the Notion client's fetch
const originalFetch = globalThis.fetch;
if (originalFetch) {
  globalThis.fetch = (url, options = {}) => {
    if (!options.agent && !options.dispatcher) {
      options.agent = agent;
    }
    return originalFetch(url, options);
  };
}

// Run the target script
const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/with-socks.mjs <script.mjs>");
  process.exit(1);
}

const targetPath = fileURLToPath(new URL(target, import.meta.url));

console.log(`🚀 Running ${target} via SOCKS5 proxy...`);

const child = spawn(process.execPath, [targetPath], {
  stdio: "inherit",
  cwd: new URL("..", import.meta.url).pathname,
  env: {
    ...process.env,
    HTTPS_PROXY: proxyUrl,
    HTTP_PROXY: proxyUrl,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
