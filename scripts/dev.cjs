const { spawn } = require("node:child_process");
const path = require("node:path");
const root = path.join(__dirname, "..");
const vite = spawn(
  process.execPath,
  [path.join(root, "node_modules/vite/bin/vite.js")],
  { cwd: root, stdio: "inherit" },
);
let electron;
async function launch() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5173")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const env = { ...process.env, BOOKLEAN_DEV_URL: "http://127.0.0.1:5173" };
  delete env.ELECTRON_RUN_AS_NODE;
  electron = spawn(require("electron"), ["."], {
    cwd: root,
    stdio: "inherit",
    env,
  });
  electron.on("exit", () => {
    vite.kill();
    process.exit(0);
  });
}
process.on("SIGINT", () => {
  electron?.kill();
  vite.kill();
  process.exit(0);
});
launch().catch((e) => {
  console.error(e);
  vite.kill();
  process.exit(1);
});
