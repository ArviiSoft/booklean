const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const sanitize = require("sanitize-html");
const fonts = require("./fonts.json");
const { themes, motifs } = require("./appearances.json");
const {
  normalizeCalendar,
  normalizePeriod,
  normalizeWorld,
} = require("./world.cjs");
const MAX_SIZE = 150 * 1024 * 1024;
function cleanHTML(value) {
  return sanitize(String(value || ""), {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "del",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "ul",
      "ol",
      "li",
      "hr",
      "span",
      "mark",
      "sup",
      "sub",
      "img",
      "a",
      "pre",
      "code",
    ],
    allowedAttributes: {
      "*": ["style"],
      span: ["data-note"],
      mark: ["data-color"],
      img: ["src", "alt", "width", "height"],
      a: ["href", "title"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["data"] },
    allowedStyles: {
      img: { "aspect-ratio": [/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/] },
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
        color: [
          /^#[0-9a-f]{3,8}$/i,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,
        ],
        "background-color": [
          /^#[0-9a-f]{3,8}$/i,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,
        ],
        "font-family": [/^[a-zA-Z ,'-]+$/],
        "font-size": [/^\d+(px|pt)$/],
        "line-height": [/^(1(\.\d{1,2})?|2(\.\d{1,2})?|3)$/],
        "margin-left": [/^(0|24|48|72|96|120)px$/],
      },
    },
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: /^data:image\/(png|jpeg|webp);base64,/i.test(attribs.src || "")
          ? attribs
          : { alt: attribs.alt || "" },
      }),
    },
  });
}
function normalizeBook(book, freshIds = false) {
  if (
    !book ||
    typeof book.title !== "string" ||
    !Array.isArray(book.chapters) ||
    !book.chapters.length
  )
    throw new Error(
      "Kitap dosyasında geçerli bir kitap adı ve en az bir bölüm bulunmalı.",
    );
  if (book.chapters.length > 2000)
    throw new Error("Bir kitap en fazla 2000 bölüm içerebilir.");
  const stamp = new Date().toISOString();
  const str = (v, max = 10000) =>
    typeof v === "string" ? v.slice(0, max) : "";
  const ids = new Set();
  const id = (v) => {
    const n =
      !freshIds && typeof v === "string" && v.length < 100 && !ids.has(v)
        ? v
        : randomUUID();
    ids.add(n);
    return n;
  };
  const calendar = normalizeCalendar(book.calendar);
  const normalized = {
    id: id(book.id),
    title: str(book.title, 300) || "Adsız kitap",
    author: str(book.author, 300),
    description: str(book.description),
    genres: Array.isArray(book.genres)
      ? book.genres
          .filter((v) => typeof v === "string")
          .slice(0, 300)
          .map((v) => v.slice(0, 80))
      : [],
    cover: /^data:image\/(png|jpeg|webp);base64,/i.test(book.cover || "")
      ? str(book.cover, 12 * 1024 * 1024)
      : "",
    color: /^#[\da-f]{6}$/i.test(book.color || "") ? book.color : "#314c48",
    motif: motifs.some((m) => m.id === book.motif) ? book.motif : "orbit",
    chapters: book.chapters.map((c) => ({
      id: id(c.id),
      title: str(c.title, 300) || "Adsız bölüm",
      html: cleanHTML(c.html),
      status: c.status === "done" ? "done" : "draft",
      notes: str(c.notes, 100000),
      updatedAt: str(c.updatedAt, 40) || stamp,
      storyPeriod: normalizePeriod(c.storyPeriod, calendar),
    })),
    characters: Array.isArray(book.characters)
      ? book.characters.slice(0, 1000).map((c) => ({
          id: id(c.id),
          name: str(c.name, 300),
          role: str(c.role, 300),
          description: str(c.description, 30000),
          traits: str(c.traits, 10000),
          motivation: str(c.motivation, 10000),
          innerConflict: str(c.innerConflict, 10000),
          height: str(c.height, 100),
          weight: str(c.weight, 100),
          hairColor: str(c.hairColor, 100),
          eyeColor: str(c.eyeColor, 100),
          skinColor: str(c.skinColor, 100),
          image: /^data:image\/(png|jpeg|webp);base64,/i.test(c.image || "")
            ? str(c.image, 12 * 1024 * 1024)
            : "",
        }))
      : [],
    notes: str(book.notes, 1000000),
    writerTools: {
      scenes: Array.isArray(book.writerTools?.scenes)
        ? book.writerTools.scenes
            .filter((s) => s && typeof s === "object")
            .slice(0, 2000)
            .map((s) => ({
              id: id(s.id),
              title: str(s.title, 300),
              summary: str(s.summary, 10000),
              done: s.done === true,
            }))
        : [],
      revisions: Array.isArray(book.writerTools?.revisions)
        ? book.writerTools.revisions
            .filter((r) => r && typeof r === "object")
            .slice(0, 2000)
            .map((r) => ({
              id: id(r.id),
              text: str(r.text, 3000),
              done: r.done === true,
            }))
        : [],
    },
    goal: Math.max(100, Math.min(Number(book.goal) || 50000, 10000000)),
    createdAt: str(book.createdAt, 40) || stamp,
    updatedAt: str(book.updatedAt, 40) || stamp,
    archived: !!book.archived,
    deletedAt:
      !freshIds &&
      typeof book.deletedAt === "string" &&
      Number.isFinite(Date.parse(book.deletedAt))
        ? book.deletedAt
        : null,
    favorite: !!book.favorite,
    lastOpenedAt: !freshIds ? str(book.lastOpenedAt, 40) : "",
    lastChapterId: !freshIds ? str(book.lastChapterId, 100) : "",
    example: !!book.example,
  };
  return {
    ...normalized,
    ...normalizeWorld(book, normalized, cleanHTML, freshIds),
  };
}
function validateLibrary(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.books))
    throw new Error("Bu dosya geçerli bir Booklean kitaplığı değil.");
  if (input.books.length > 1000)
    throw new Error("Kitaplık boyutu sınırı aşıldı.");
  const preferences = input.preferences || {};
  const books = input.books.map((b) => normalizeBook(b));
  if (new Set(books.map((b) => b.id)).size !== books.length)
    throw new Error("Kitaplıkta yinelenen kitap kimlikleri var.");
  return {
    version: 1,
    books,
    preferences: {
      theme: themes.some((t) => t.id === preferences.theme)
        ? preferences.theme
        : "dark",
      font: fonts.some((font) => font.id === preferences.font)
        ? preferences.font
        : "Georgia",
      fontSize: Math.min(30, Math.max(14, Number(preferences.fontSize) || 19)),
      lineHeight: Math.min(
        2.5,
        Math.max(1.3, Number(preferences.lineHeight) || 1.9),
      ),
      dailyGoal: Math.min(
        100000,
        Math.max(50, Number(preferences.dailyGoal) || 500),
      ),
      discordPresence: preferences.discordPresence !== false,
      startupAnimation: preferences.startupAnimation !== false,
      bookAnimation: preferences.bookAnimation !== false,
      librarySort: [
        "manual",
        "recent",
        "name",
        "author",
        "words",
        "created",
      ].includes(preferences.librarySort)
        ? preferences.librarySort
        : "recent",
      lastBookId:
        typeof preferences.lastBookId === "string"
          ? preferences.lastBookId
          : undefined,
    },
    activity: Object.fromEntries(
      Object.entries(input.activity || {})
        .filter(
          ([k, v]) =>
            /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(v) && v >= 0,
        )
        .slice(-3660),
    ),
  };
}
class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, "library.json");
    this.backupDir = path.join(dir, "backups");
    this.queue = Promise.resolve();
  }
  async readJSON(file) {
    const stat = await fs.stat(file);
    if (stat.size > MAX_SIZE) throw new Error("Kitaplık dosyası çok büyük.");
    return validateLibrary(JSON.parse(await fs.readFile(file, "utf8")));
  }
  async listBackups() {
    await fs.mkdir(this.backupDir, { recursive: true });
    const names = (await fs.readdir(this.backupDir))
      .filter((n) => /^backup-.*\.json$/.test(n))
      .sort()
      .reverse();
    return Promise.all(
      names.map(async (name) => ({
        name,
        date: (
          await fs.stat(path.join(this.backupDir, name))
        ).mtime.toISOString(),
      })),
    );
  }
  async readBackup(name) {
    if (!/^backup-[\w.-]+\.json$/.test(name))
      throw new Error("Geçersiz yedek adı.");
    return this.readJSON(path.join(this.backupDir, name));
  }
  snapshot(input) {
    const result = this.queue.then(async () => {
      if (input) await this.writeLibrary(input);
      const library = await this.readJSON(this.file);
      await fs.mkdir(this.backupDir, { recursive: true });
      const date = new Date().toISOString();
      const name = `backup-${date.replace(/:/g, "-")}-${randomUUID()}.json`;
      const file = path.join(this.backupDir, name);
      const temp = file + ".tmp";
      const handle = await fs.open(temp, "wx");
      try {
        await handle.writeFile(JSON.stringify(library), "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(temp, file);
      return { name, date };
    });
    this.queue = result.catch(() => {});
    return result;
  }
  async load() {
    await fs.mkdir(this.dir, { recursive: true });
    try {
      return { library: await this.readJSON(this.file), dataPath: this.dir };
    } catch (error) {
      const backups = await this.listBackups();
      if (error.code === "ENOENT" && !backups.length)
        return { library: null, dataPath: this.dir };
      for (const backup of backups) {
        try {
          const library = await this.readBackup(backup.name);
          return {
            library,
            dataPath: this.dir,
            recovery:
              "Ana kayıt okunamadı. Son sağlam yedeğiniz açıldı; mevcut dosya korunacak.",
          };
        } catch {}
      }
      throw new Error(
        "Kitaplık okunamadı. Dosyanız korunuyor. Veri klasöründeki library.json ve backups klasörünü kontrol edin. " +
          error.message,
      );
    }
  }
  save(input) {
    const result = this.queue.then(() => this.writeLibrary(input));
    this.queue = result.catch(() => {});
    return result;
  }
  async writeLibrary(input) {
    const library = validateLibrary(input);
    const content = JSON.stringify(library);
    if (Buffer.byteLength(content) > MAX_SIZE)
      throw new Error(
        "Kitaplık 150 MB sınırını aşıyor. Büyük görselleri küçültün.",
      );
    await fs.mkdir(this.backupDir, { recursive: true });
    let previous;
    try {
      previous = await fs.readFile(this.file);
      await this.readJSON(this.file);
    } catch (e) {
      if (previous) {
        await fs.writeFile(
          path.join(this.dir, `recovered-original-${Date.now()}.json`),
          previous,
        );
        previous = undefined;
      } else if (e.code !== "ENOENT") throw e;
    }
    const temp = this.file + ".tmp";
    const handle = await fs.open(temp, "w");
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temp, this.file);
    return { savedAt: new Date().toISOString() };
  }
}
module.exports = { Store, validateLibrary, normalizeBook, cleanHTML };
