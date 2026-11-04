const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  nativeImage,
  Menu,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { normalizeBook } = require("./storage.cjs");
const { LibraryLocation } = require("./library-location.cjs");
const { DiscordPresence } = require("./discord-presence.cjs");
const { applicationId } = require("./discord-config.json");
const { importFile, exportBuffer, documentHTML } = require("./formats.cjs");
app.setName("Booklean");
if (process.env.BOOKLEAN_DATA_DIR)
  app.setPath("userData", path.resolve(process.env.BOOKLEAN_DATA_DIR));
else if (!app.isPackaged)
  app.setPath("userData", path.join(app.getPath("appData"), "Booklean-dev"));
let win,
  store,
  presence,
  canClose = false,
  closeTimer;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    store = new LibraryLocation(app.getPath("userData"));
    presence = new DiscordPresence({ applicationId });
    presence.on("status", (status) => {
      if (win && !win.isDestroyed())
        win.webContents.send("discord:status", status);
    });
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1440,
      height: 940,
      minWidth: 1120,
      minHeight: 720,
      show: false,
      frame: false,
      title: "Booklean",
      backgroundColor: "#0f0d0c",
      icon: path.join(__dirname, "../build/icon.ico"),
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: true,
      },
    });
    win.webContents.session.setPermissionRequestHandler(
      (_wc, _permission, callback) => callback(false),
    );
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event, url) => {
      const allowed = process.env.BOOKLEAN_DEV_URL;
      if (!allowed || !url.startsWith(allowed + "/")) event.preventDefault();
    });
    win.on("ready-to-show", () => win.show());
    win.on("close", (event) => {
      if (!canClose) {
        event.preventDefault();
        win.webContents.send("window:closing");
        clearTimeout(closeTimer);
        closeTimer = setTimeout(async () => {
          if (!win || win.isDestroyed()) return;
          const { response } = await dialog.showMessageBox(win, {
            type: "warning",
            buttons: ["Bekle", "Kaydetmeden kapat"],
            defaultId: 0,
            cancelId: 0,
            message: "Kaydetme henüz tamamlanmadı.",
            detail:
              "Biraz daha bekleyebilir veya son değişiklikleri kaydetmeden çıkabilirsiniz.",
          });
          if (response === 1) {
            canClose = true;
            win.close();
          }
        }, 15000);
      }
    });
    if (process.env.BOOKLEAN_DEV_URL) win.loadURL(process.env.BOOKLEAN_DEV_URL);
    else win.loadFile(path.join(__dirname, "../dist/index.html"));
    function handle(channel, fn) {
      ipcMain.handle(channel, async (event, ...args) => {
        if (
          event.sender !== win.webContents ||
          event.senderFrame !== win.webContents.mainFrame
        )
          throw new Error("İzin verilmeyen istek.");
        return fn(...args);
      });
    }
    handle("library:load", async () => {
      const result = await store.load();
      presence.setEnabled(
        process.env.BOOKLEAN_DISABLE_DISCORD !== "1" &&
          result.library?.preferences.discordPresence !== false,
      );
      return result;
    });
    handle("library:save", async (data) => {
      const result = await store.save(data);
      presence.setEnabled(
        process.env.BOOKLEAN_DISABLE_DISCORD !== "1" &&
          data.preferences?.discordPresence !== false,
      );
      return result;
    });
    handle("discord:set-context", (context) => {
      presence.setContext(context);
    });
    handle("discord:get-status", () => presence.status);
    handle("backup:list", () => store.listBackups());
    handle("backup:create", (data) => store.snapshot(data));
    handle("backup:read", (name) => store.readBackup(name));
    handle("backup:delete", (name) => store.deleteBackup(name));
    handle("data:open", async () => {
      const error = await shell.openPath(store.dir);
      if (error) throw new Error(error);
    });
    handle("data:choose", async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Kitaplık ve yedekler için kayıt klasörü seçin",
        defaultPath: store.dir,
        properties: ["openDirectory", "createDirectory"],
      });
      if (canceled || !filePaths[0]) return null;
      return store.changeDirectory(filePaths[0]);
    });
    handle("image:pick", async () => {
      const { filePaths, canceled } = await dialog.showOpenDialog(win, {
        title: "Görsel seç",
        filters: [
          { name: "Görseller", extensions: ["jpg", "jpeg", "png", "webp"] },
        ],
        properties: ["openFile"],
      });
      if (canceled) return null;
      const stat = await fs.stat(filePaths[0]);
      if (stat.size > 20 * 1024 * 1024)
        throw new Error("Görsel en fazla 20 MB olabilir.");
      let img = nativeImage.createFromPath(filePaths[0]);
      if (img.isEmpty()) throw new Error("Görsel okunamadı.");
      const { width, height } = img.getSize();
      if (Math.max(width, height) > 1600)
        img = img.resize(width > height ? { width: 1600 } : { height: 1600 });
      return "data:image/jpeg;base64," + img.toJPEG(88).toString("base64");
    });
    handle("file:import", async () => {
      const { filePaths, canceled } = await dialog.showOpenDialog(win, {
        title: "Yazılarınızı içe aktarın",
        filters: [
          {
            name: "Desteklenen belgeler",
            extensions: [
              "booklean",
              "json",
              "txt",
              "md",
              "markdown",
              "csv",
              "html",
              "htm",
              "docx",
              "pdf",
              "rtf",
              "epub",
              "odt",
            ],
          },
        ],
        properties: ["openFile", "multiSelections"],
      });
      if (canceled) return null;
      const results = [];
      for (const file of filePaths) results.push(await importFile(file));
      return results;
    });
    handle("file:export", async (raw, format, chapterId) => {
      const formats = [
        "booklean",
        "txt",
        "md",
        "html",
        "csv",
        "docx",
        "pdf",
        "epub",
        "odt",
        "rtf",
      ];
      if (!formats.includes(format)) throw new Error("Geçersiz dosya türü.");
      const book = normalizeBook(raw);
      if (chapterId) {
        book.chapters = book.chapters.filter((c) => c.id === chapterId);
        if (!book.chapters.length) throw new Error("Bölüm bulunamadı.");
        book.lastChapterId = chapterId;
        Object.assign(book, normalizeBook(book));
      }
      const name =
        (chapterId ? book.chapters[0].title : book.title)
          .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
          .slice(0, 100) || "Kitap";
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        title: "Dışa aktar",
        defaultPath: name + "." + format,
        filters: [
          { name: format.toUpperCase() + " dosyası", extensions: [format] },
        ],
      });
      if (canceled) return null;
      if (format === "pdf") {
        const temp = path.join(
          app.getPath("temp"),
          "booklean-print-" + Date.now() + ".html",
        );
        const print = new BrowserWindow({
          show: false,
          webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
          },
        });
        try {
          await fs.writeFile(temp, documentHTML(book));
          await print.loadFile(temp);
          await print.webContents.executeJavaScript("document.fonts.ready");
          const pdf = await print.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: false,
          });
          await fs.writeFile(filePath, pdf);
        } finally {
          print.destroy();
          await fs.unlink(temp).catch(() => {});
        }
      } else await fs.writeFile(filePath, await exportBuffer(book, format));
      return filePath;
    });
    for (const [channel, action] of Object.entries({
      "window:minimize": () => win.minimize(),
      "window:maximize": () =>
        win.isMaximized() ? win.unmaximize() : win.maximize(),
      "window:close": () => win.close(),
      "window:confirm-close": () => {
        clearTimeout(closeTimer);
        canClose = true;
        win.close();
      },
    }))
      ipcMain.on(channel, (event) => {
        if (event.sender === win.webContents) action();
      });
  });
  app.on("before-quit", () => presence?.dispose());
  app.on("window-all-closed", () => app.quit());
}
