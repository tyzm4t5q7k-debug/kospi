const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repo = path.resolve(__dirname, "..");
const url = "http://127.0.0.1:3012/stocks#personal-connection";
const log = path.join(repo, ".next", "local-server.log");
const next = path.join(repo, "node_modules", "next", "dist", "bin", "next");

async function probe() {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  } catch {
    return false;
  }
  const html = await response.text();
  if (response.ok && html.includes("MARKET LAB")) return true;
  throw new Error(
    "Port 3012 is occupied or the app is unhealthy. Check " + log,
  );
}

async function main() {
  if (!(await probe())) {
    if (!fs.existsSync(next))
      throw new Error("Project dependencies are missing: " + repo);
    if (!fs.existsSync(path.join(repo, ".env.local")))
      throw new Error(
        "Local Toss settings are missing. Restore .env.local without sharing its contents.",
      );
    if (!fs.existsSync(path.join(repo, ".next", "BUILD_ID"))) {
      console.log("Building the local site...");
      const built = spawnSync(process.execPath, [next, "build"], {
        cwd: repo,
        stdio: "inherit",
        windowsHide: true,
      });
      if (built.error) throw built.error;
      if (built.status !== 0)
        throw new Error("Build failed. The local server was not started.");
    }
    const out = fs.openSync(log, "a");
    const server = spawn(
      process.execPath,
      [next, "start", "--hostname", "127.0.0.1", "--port", "3012"],
      {
        cwd: repo,
        windowsHide: true,
        detached: true,
        stdio: ["ignore", out, out],
      },
    );
    fs.closeSync(out);
    await new Promise((resolve, reject) => {
      server.once("spawn", resolve);
      server.once("error", reject);
    });
    server.unref();
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await probe()) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready)
      throw new Error("The local server did not become ready. Check " + log);
  }
  console.log("Local stock analysis is ready: " + url);
  console.log("Toss access is read-only. No automatic orders are enabled.");
  if (!process.argv.includes("--check")) {
    const browser = spawn(
      "rundll32.exe",
      ["url.dll,FileProtocolHandler", url],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    await new Promise((resolve, reject) => {
      browser.once("spawn", resolve);
      browser.once("error", reject);
    });
    browser.unref();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
