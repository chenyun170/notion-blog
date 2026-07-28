// SOCKS5 proxy wrapper - patches https/http global agent to use SOCKS5 proxy
// Usage: node socks-wrapper.mjs <target-script.mjs>

import { SocksProxyAgent } from "socks-proxy-agent";
import https from "node:https";
import http from "node:http";
import { spawn } from "node:child_process";

const proxyUrl = "socks5://127.0.0.1:10808";
const socksAgent = new SocksProxyAgent(proxyUrl);

// Override global agents
https.globalAgent = socksAgent;
http.globalAgent = socksAgent;

// Fix: Also patch module-level agents
import { Agent as HttpsAgent } from "node:https";
import { Agent as HttpAgent } from "node:http";

const origCreateConnection = HttpsAgent.prototype.createConnection;
HttpsAgent.prototype.createConnection = function (options, cb) {
  return socksAgent.createConnection(options, cb);
};

const target = process.argv[2];
if (!target) {
  console.error("Usage: node socks-wrapper.mjs <script-path>");
  process.exit(1);
}

console.log(`🌐 Running ${target} via SOCKS5 proxy...`);

const child = spawn(process.execPath, [target], {
  stdio: "inherit",
  cwd: ".",
  env: {
    ...process.env,
    HTTPS_PROXY: proxyUrl,
    HTTP_PROXY: proxyUrl,
    NODE_NO_WARNINGS: "1",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
