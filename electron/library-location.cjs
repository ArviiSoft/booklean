const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { Store } = require("./storage.cjs");

const samePath = (a, b) =>
  process.platform === "win32"
    ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()
    : path.resolve(a) === path.resolve(b);

class LibraryLocation {
  constructor(profileDir) {
    this.profileDir = path.resolve(profileDir);
    this.configFile = path.join(this.profileDir, "library-location.json");
    this.current = new Store(this.profileDir);
    this.queue = Promise.resolve();
    this.ready = this.initialize();
    this.ready.catch(() => {});
  }
  get dir() {
    return this.current.dir;
  }
  async initialize() {
    let config;
    try {
      config = JSON.parse(await fs.readFile(this.configFile, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw new Error(
        "Kayıt konumu ayarı okunamadı. library-location.json dosyanızı kontrol edin.",
      );
    }
    if (
      config.version !== 1 ||
      typeof config.dataPath !== "string" ||
      !path.isAbsolute(config.dataPath)
    )
      throw new Error("Kayıt klasörü ayarı geçersiz.");
    this.current = new Store(path.resolve(config.dataPath));
  }
  async checkDirectory() {
    if (samePath(this.dir, this.profileDir)) return;
    try {
      if (!(await fs.stat(this.dir)).isDirectory()) throw new Error();
    } catch {
      throw new Error(
        "Seçili kayıt klasörüne ulaşılamıyor: " +
          this.dir +
          ". Diski bağlayıp yeniden deneyin.",
      );
    }
  }
  run(job) {
    const result = this.queue.then(async () => {
      await this.ready;
      await this.checkDirectory();
      return job();
    });
    this.queue = result.catch(() => {});
    return result;
  }
  load() {
    return this.run(async () => {
      const data = await this.current.load();
      if (!data.library && !samePath(this.dir, this.profileDir))
        throw new Error(
          "Seçili klasörde kitaplık bulunamadı. Dosyalarınızı geri yükleyip yeniden deneyin: " +
            this.dir,
        );
      return data;
    });
  }
  save(data) {
    return this.run(() => this.current.save(data));
  }
  listBackups() {
    return this.run(() => this.current.listBackups());
  }
  readBackup(name) {
    return this.run(() => this.current.readBackup(name));
  }
  deleteBackup(name) {
    return this.run(() => this.current.deleteBackup(name));
  }
  snapshot(data) {
    return this.run(() => this.current.snapshot(data));
  }
  changeDirectory(target) {
    return this.run(async () => {
      if (typeof target !== "string" || !path.isAbsolute(target))
        throw new Error("Geçerli bir klasör seçin.");
      const destination = path.resolve(target);
      if (samePath(destination, this.dir))
        return { dataPath: this.dir, changed: false };
      await fs.mkdir(destination, { recursive: true });
      const realDestination = await fs.realpath(destination);
      const realSource = await fs.realpath(this.dir);
      if (samePath(realDestination, realSource))
        return { dataPath: this.dir, changed: false };
      const finalFile = path.join(destination, "library.json");
      try {
        await fs.access(finalFile);
        throw new Error(
          "Bu klasörde zaten bir Booklean kitaplığı var. Mevcut kitaplığın üzerine yazılmadı; başka bir klasör seçin.",
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      const { library } = await this.current.load();
      if (!library) throw new Error("Önce kitaplığınızı kaydedin.");
      const backups = await this.current.listBackups();
      const destinationBackups = path.join(destination, "backups");
      await fs.mkdir(destinationBackups, { recursive: true });
      for (const backup of backups) {
        const source = path.join(this.current.backupDir, backup.name);
        let file = path.join(destinationBackups, backup.name);
        try {
          await fs.copyFile(source, file, constants.COPYFILE_EXCL);
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
          file = path.join(
            destinationBackups,
            backup.name.replace(/\.json$/, `-${randomUUID()}.json`),
          );
          await fs.copyFile(source, file, constants.COPYFILE_EXCL);
        }
      }
      const staging = path.join(
        destination,
        `.booklean-migration-${randomUUID()}.tmp`,
      );
      try {
        const handle = await fs.open(staging, "wx");
        try {
          await handle.writeFile(JSON.stringify(library), "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        const next = new Store(destination);
        await next.readJSON(staging);
        await fs.copyFile(staging, finalFile, constants.COPYFILE_EXCL);
        const configTemp = this.configFile + "." + randomUUID() + ".tmp";
        try {
          const handle = await fs.open(configTemp, "wx");
          try {
            await handle.writeFile(
              JSON.stringify({ version: 1, dataPath: destination }),
              "utf8",
            );
            await handle.sync();
          } finally {
            await handle.close();
          }
          await fs.rename(configTemp, this.configFile);
        } finally {
          await fs.unlink(configTemp).catch(() => {});
        }
        this.current = next;
        return { dataPath: destination, changed: true };
      } finally {
        await fs.unlink(staging).catch(() => {});
      }
    });
  }
}
module.exports = { LibraryLocation };
