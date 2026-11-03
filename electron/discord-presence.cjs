const net = require("node:net");
const { EventEmitter } = require("node:events");
const { randomUUID } = require("node:crypto");
const path = require("node:path");

function encodeFrame(op, payload) {
  const body = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(JSON.stringify(payload));
  const header = Buffer.alloc(8);
  header.writeUInt32LE(op, 0);
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}
class FrameDecoder {
  constructor(onFrame) {
    this.buffer = Buffer.alloc(0);
    this.onFrame = onFrame;
  }
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 8) {
      const op = this.buffer.readUInt32LE(0),
        length = this.buffer.readUInt32LE(4);
      if (length > 1024 * 1024) throw new Error("RPC frame too large");
      if (this.buffer.length < 8 + length) return;
      const body = this.buffer.subarray(8, 8 + length);
      this.buffer = this.buffer.subarray(8 + length);
      this.onFrame(op, body);
    }
  }
}
function pipePaths() {
  return Array.from({ length: 10 }, (_, i) =>
    process.platform === "win32"
      ? `\\\\?\\pipe\\discord-ipc-${i}`
      : path.join(
          process.env.XDG_RUNTIME_DIR ||
            process.env.TMPDIR ||
            process.env.TMP ||
            process.env.TEMP ||
            "/tmp",
          `discord-ipc-${i}`,
        ),
  );
}
function cleanText(value, fallback) {
  const text =
    typeof value === "string"
      ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim()
      : "";
  return [...(text || fallback)].slice(0, 128).join("");
}
function chapterNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= 2000 ? value : 1;
}
function activityFor(context, start) {
  return {
    type: 0,
    details: context
      ? cleanText(context.bookTitle, "🔖 Adsız kitap")
      : "📚 Kitaplıkta",
    state: context
      ? cleanText(
          `${chapterNumber(context.chapterNumber)} Bölüm: ${context.chapterTitle || "🔖 Adsız bölüm"}`,
          "📝 Yazıyor...",
        )
      : "Yeni bir hikâye hazırlıyor ✍️",
    timestamps: { start },
  };
}

class DiscordPresence extends EventEmitter {
  constructor({
    applicationId,
    paths = pipePaths(),
    retryMs = 15000,
    updateMs = 4500,
    connectMs = 4000,
  } = {}) {
    super();
    this.applicationId = applicationId;
    this.paths = paths;
    this.retryMs = retryMs;
    this.updateMs = updateMs;
    this.connectMs = connectMs;
    this.enabled = false;
    this.status = "disabled";
    this.socket = null;
    this.ready = false;
    this.connecting = false;
    this.context = null;
    this.startedAt = Math.floor(Date.now() / 1000);
    this.lastSent = 0;
    this.lastPayload = "";
    this.pendingNonce = null;
    this.generation = 0;
    this.disposed = false;
  }
  setStatus(status) {
    if (this.status !== status) {
      this.status = status;
      this.emit("status", status);
    }
  }
  setEnabled(enabled) {
    enabled = !!enabled;
    if (this.disposed || this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.disconnect(true);
      this.setStatus("disabled");
      return;
    }
    if (!/^\d{17,20}$/.test(this.applicationId || "")) {
      this.setStatus("error");
      return;
    }
    this.connect();
  }
  setContext(context) {
    this.context =
      context && typeof context === "object"
        ? {
            bookTitle: cleanText(context.bookTitle, "Adsız kitap"),
            chapterTitle: cleanText(context.chapterTitle, "Adsız bölüm"),
            chapterNumber: chapterNumber(context.chapterNumber),
          }
        : null;
    if (this.enabled && this.ready) this.scheduleUpdate();
  }
  async connect() {
    if (!this.enabled || this.disposed || this.connecting || this.socket)
      return;
    this.connecting = true;
    this.setStatus("connecting");
    const generation = this.generation;
    for (const pipe of this.paths) {
      if (generation !== this.generation || !this.enabled) {
        this.connecting = false;
        return;
      }
      const socket = await new Promise((resolve) => {
        const candidate = net.createConnection(pipe);
        this.candidate = candidate;
        let settled = false;
        const timeout = setTimeout(() => finish(null), this.connectMs);
        timeout.unref?.();
        const finish = (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          if (!result) candidate.destroy();
          if (this.candidate === candidate) this.candidate = null;
          resolve(result);
        };
        candidate.once("connect", () => finish(candidate));
        candidate.on("error", () => finish(null));
        candidate.once("close", () => finish(null));
      });
      if (!socket) continue;
      if (generation !== this.generation || !this.enabled) {
        socket.destroy();
        this.connecting = false;
        return;
      }
      this.socket = socket;
      this.connecting = false;
      this.ready = false;
      this.lastPayload = "";
      const decoder = new FrameDecoder((op, body) =>
        this.onFrame(op, body, socket),
      );
      socket.on("data", (chunk) => {
        try {
          decoder.push(chunk);
        } catch {
          this.setStatus("error");
          socket.destroy();
        }
      });
      socket.on("error", () => {});
      socket.on("close", () => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.ready = false;
        clearTimeout(this.handshakeTimer);
        clearTimeout(this.ackTimer);
        this.pendingNonce = null;
        if (this.enabled && !this.disposed) {
          if (this.status !== "error") this.setStatus("waiting");
          this.retry();
        }
      });
      this.handshakeTimer = setTimeout(() => {
        if (!this.ready && this.socket === socket) socket.destroy();
      }, this.connectMs);
      this.handshakeTimer.unref?.();
      socket.write(encodeFrame(0, { v: 1, client_id: this.applicationId }));
      return;
    }
    this.connecting = false;
    if (generation === this.generation && this.enabled) {
      this.setStatus("waiting");
      this.retry();
    }
  }
  retry() {
    clearTimeout(this.retryTimer);
    if (this.enabled && !this.disposed) {
      this.retryTimer = setTimeout(() => this.connect(), this.retryMs);
      this.retryTimer.unref?.();
    }
  }
  onFrame(op, body, socket) {
    if (this.socket !== socket) return;
    if (op === 3) {
      socket.write(encodeFrame(4, body));
      return;
    }
    if (op === 2) {
      this.setStatus("error");
      socket.destroy();
      return;
    }
    if (op !== 1) return;
    const message = JSON.parse(body.toString("utf8"));
    if (message.evt === "READY") {
      clearTimeout(this.handshakeTimer);
      this.ready = true;
      this.lastSent = 0;
      this.scheduleUpdate();
    } else if (message.evt === "ERROR") {
      this.setStatus("error");
      socket.destroy();
    } else if (
      message.cmd === "SET_ACTIVITY" &&
      message.nonce === this.pendingNonce
    ) {
      clearTimeout(this.ackTimer);
      this.pendingNonce = null;
      this.setStatus("connected");
    }
  }
  scheduleUpdate() {
    if (!this.ready || !this.enabled || !this.socket) return;
    clearTimeout(this.updateTimer);
    const delay = Math.max(0, this.updateMs - (Date.now() - this.lastSent));
    if (delay) {
      this.updateTimer = setTimeout(() => this.sendActivity(), delay);
      this.updateTimer.unref?.();
    } else this.sendActivity();
  }
  sendActivity() {
    if (!this.ready || !this.enabled || !this.socket) return;
    const activity = activityFor(this.context, this.startedAt);
    const serialized = JSON.stringify(activity);
    if (serialized === this.lastPayload) return;
    this.lastPayload = serialized;
    this.lastSent = Date.now();
    this.pendingNonce = randomUUID();
    this.socket.write(
      encodeFrame(1, {
        cmd: "SET_ACTIVITY",
        args: { pid: process.pid, activity },
        nonce: this.pendingNonce,
      }),
    );
    clearTimeout(this.ackTimer);
    const socket = this.socket;
    this.ackTimer = setTimeout(() => {
      if (this.socket === socket && this.pendingNonce) {
        this.setStatus("error");
        socket.destroy();
      }
    }, 10000);
    this.ackTimer.unref?.();
  }
  disconnect(clear) {
    this.generation++;
    for (const timer of [
      "retryTimer",
      "updateTimer",
      "handshakeTimer",
      "ackTimer",
    ])
      clearTimeout(this[timer]);
    this.candidate?.destroy();
    this.candidate = null;
    this.connecting = false;
    const socket = this.socket;
    this.socket = null;
    this.ready = false;
    this.pendingNonce = null;
    if (socket && !socket.destroyed) {
      if (clear && socket.writable) {
        socket.end(
          encodeFrame(1, {
            cmd: "SET_ACTIVITY",
            args: { pid: process.pid, activity: null },
            nonce: randomUUID(),
          }),
        );
        setTimeout(() => socket.destroy(), 200).unref?.();
      } else socket.destroy();
    }
  }
  dispose() {
    this.disposed = true;
    this.enabled = false;
    this.disconnect(true);
    this.setStatus("disabled");
  }
}
module.exports = { DiscordPresence, FrameDecoder, encodeFrame, activityFor };
