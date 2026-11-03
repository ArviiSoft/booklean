const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const JSZip = require("jszip");
const Papa = require("papaparse");
const { parseHTML, DOMParser } = require("linkedom");
const { normalizeBook, cleanHTML } = require("./storage.cjs");
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function textOf(html) {
  const { document } = parseHTML(
    "<html><body>" +
      html
        .replace(/<\/(p|h\d|li|blockquote|pre)>/gi, "</$1>\n\n")
        .replace(/<br\s*\/?\s*>/gi, "\n") +
      "</body></html>",
  );
  return document.body.textContent.replace(/\n{3,}/g, "\n\n").trim();
}
const textHTML = (text) =>
  String(text)
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>")
    .join("") || "<p></p>";
const chapter = (title, html) => ({
  id: randomUUID(),
  title,
  html: cleanHTML(html),
  notes: "",
  status: "draft",
  updatedAt: new Date().toISOString(),
});
function baseBook(title, chapters, extra = {}) {
  return normalizeBook({
    id: randomUUID(),
    title,
    chapters,
    genres: [],
    ...extra,
  });
}
function decode(buffer) {
  if (buffer[0] === 255 && buffer[1] === 254)
    return buffer.subarray(2).toString("utf16le");
  if (buffer[0] === 254 && buffer[1] === 255)
    return require("iconv-lite").decode(buffer.subarray(2), "utf16-be");
  const utf = buffer.toString("utf8");
  return utf.includes("\uFFFD")
    ? require("iconv-lite").decode(buffer, "windows-1254")
    : utf.replace(/^\uFEFF/, "");
}
function splitHTML(html, fallback) {
  const { document } = parseHTML(
    "<html><body>" + cleanHTML(html) + "</body></html>",
  );
  const result = [];
  let title = fallback,
    parts = [];
  for (const node of document.body.childNodes) {
    if (node.nodeType === 1 && /^H[12]$/.test(node.tagName)) {
      if (parts.length) result.push(chapter(title, parts.join("")));
      title = node.textContent || fallback;
      parts = [];
    } else parts.push(node.outerHTML || esc(node.textContent));
  }
  if (parts.length || !result.length)
    result.push(chapter(title, parts.join("") || "<p></p>"));
  return result;
}
async function safeZip(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  let size = 0;
  const entries = Object.values(zip.files);
  if (entries.length > 10000)
    throw new Error("Arşiv çok fazla dosya içeriyor.");
  for (const entry of entries) size += entry._data?.uncompressedSize || 0;
  if (size > 100 * 1024 * 1024)
    throw new Error("Açılmış belge boyutu 100 MB sınırını aşıyor.");
  return zip;
}
function rtfText(input) {
  let out = "",
    skip = false,
    uc = 1,
    fallback = 0;
  const stack = [];
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === "{") {
      stack.push({ skip, uc });
      continue;
    }
    if (c === "}") {
      const state = stack.pop();
      if (state) {
        skip = state.skip;
        uc = state.uc;
      }
      continue;
    }
    if (c === "\\") {
      const rem = input.slice(i + 1);
      if (/^[{}\\]/.test(rem)) {
        if (!skip && fallback-- <= 0) out += rem[0];
        i++;
        continue;
      }
      if (rem[0] === "*") {
        skip = true;
        i++;
        continue;
      }
      const hex = /^'([\da-f]{2})/i.exec(rem);
      if (hex) {
        if (!skip && fallback-- <= 0)
          out += require("iconv-lite").decode(
            Buffer.from([parseInt(hex[1], 16)]),
            "windows-1254",
          );
        i += 3;
        continue;
      }
      const m = /^([a-z]+)(-?\d+)? ?/i.exec(rem);
      if (m) {
        i += m[0].length;
        const name = m[1],
          n = Number(m[2]);
        if (
          [
            "fonttbl",
            "colortbl",
            "stylesheet",
            "info",
            "pict",
            "object",
            "header",
            "footer",
            "listtable",
            "listoverridetable",
          ].includes(name)
        )
          skip = true;
        if (name === "uc") uc = n;
        if (!skip) {
          if (name === "u") {
            out += String.fromCharCode(n < 0 ? n + 65536 : n);
            fallback = uc;
          } else if (["par", "line"].includes(name)) out += "\n";
          else if (name === "tab") out += "\t";
          else if (name === "emdash") out += "—";
          else if (name === "endash") out += "–";
        }
        continue;
      }
      i++;
      continue;
    }
    if (!skip && c !== "\r" && c !== "\n" && fallback-- <= 0) out += c;
  }
  return out;
}
async function importFile(file) {
  const stat = await fs.stat(file);
  if (stat.size > 32 * 1024 * 1024)
    throw new Error("İçe aktarılacak dosya en fazla 32 MB olabilir.");
  const buffer = await fs.readFile(file),
    ext = path.extname(file).toLowerCase(),
    title = path.basename(file, ext);
  let chapters = [],
    extra = {},
    warnings = [];
  if (ext === ".booklean" || ext === ".json") {
    const value = JSON.parse(decode(buffer));
    return { book: normalizeBook(value.book || value, true), warnings: [] };
  }
  if (ext === ".txt") chapters = [chapter(title, textHTML(decode(buffer)))];
  else if ([".md", ".markdown"].includes(ext)) {
    const { marked } = await import("marked");
    chapters = splitHTML(await marked.parse(decode(buffer)), title);
  } else if ([".html", ".htm"].includes(ext))
    chapters = splitHTML(decode(buffer), title);
  else if (ext === ".csv") {
    const result = Papa.parse(decode(buffer), {
      header: true,
      skipEmptyLines: "greedy",
    });
    if (result.errors.some((e) => e.type === "Quotes"))
      throw new Error("CSV dosyasının tırnak yapısı okunamadı.");
    chapters = result.data.map((row, i) => {
      const title =
        row.title ||
        row.baslik ||
        row["başlık"] ||
        row.bolum ||
        row["bölüm"] ||
        Object.values(row)[0] ||
        `Bölüm ${i + 1}`;
      const body =
        row.html ||
        row.content ||
        row.icerik ||
        row["içerik"] ||
        row.text ||
        Object.values(row)[1] ||
        "";
      return {
        ...chapter(String(title), row.html ? body : textHTML(body)),
        notes: String(row.notes || ""),
        status: row.status === "done" ? "done" : "draft",
      };
    });
    if (!chapters.length)
      throw new Error(
        "CSV içinde bölüm bulunamadı. İlk satır başlık, sonraki satırlar bölüm olmalı.",
      );
  } else if (ext === ".docx") {
    await safeZip(buffer);
    const mammoth = require("mammoth");
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => ({
          src:
            "data:" +
            image.contentType +
            ";base64," +
            (await image.read("base64")),
        })),
      },
    );
    chapters = splitHTML(result.value, title);
    warnings.push(
      "Word sayfa düzeni sadeleştirilir; temel metin biçimleri korunur.",
    );
  } else if (ext === ".pdf") {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    let result;
    try {
      result = await parser.getText({ pageJoiner: "" });
    } finally {
      await parser.destroy();
    }
    if (!result.text.trim())
      throw new Error(
        "Bu PDF okunabilir metin içermiyor. Taranmış PDF belgeleri için önce OCR uygulayın.",
      );
    chapters = [chapter(title, textHTML(result.text))];
    warnings.push(
      "PDF metin olarak alındı; sayfa düzeni ve görseller aktarılmaz.",
    );
  } else if (ext === ".rtf") {
    chapters = [chapter(title, textHTML(rtfText(decode(buffer))))];
    warnings.push("RTF metin olarak alındı; görseller ve biçimler aktarılmaz.");
  } else if (ext === ".odt") {
    const zip = await safeZip(buffer);
    const file = zip.file("content.xml");
    if (!file) throw new Error("ODT belgesinin içeriği bulunamadı.");
    const doc = new DOMParser().parseFromString(
      await file.async("string"),
      "text/xml",
    );
    let html = "";
    for (const el of doc.querySelectorAll("text\\:p, text\\:h"))
      html +=
        (el.tagName === "text:h" ? "<h2>" : "<p>") +
        esc(el.textContent) +
        (el.tagName === "text:h" ? "</h2>" : "</p>");
    chapters = splitHTML(html, title);
    warnings.push(
      "ODT metni ve bölüm başlıkları alındı; karmaşık biçimler sadeleştirilir.",
    );
  } else if (ext === ".epub") {
    const zip = await safeZip(buffer);
    const container = zip.file("META-INF/container.xml");
    if (!container) throw new Error("EPUB kapsayıcısı bulunamadı.");
    const xml = new DOMParser().parseFromString(
      await container.async("string"),
      "text/xml",
    );
    const opf = xml.querySelector("rootfile")?.getAttribute("full-path");
    if (!opf || !zip.file(opf))
      throw new Error("EPUB kitap bilgisi bulunamadı.");
    const meta = new DOMParser().parseFromString(
      await zip.file(opf).async("string"),
      "text/xml",
    );
    extra.author = meta.querySelector("dc\\:creator")?.textContent || "";
    const directory = path.posix.dirname(opf);
    const items = new Map(
      [...meta.querySelectorAll("manifest item")].map((el) => [
        el.getAttribute("id"),
        el.getAttribute("href"),
      ]),
    );
    for (const item of meta.querySelectorAll("spine itemref")) {
      const href = items.get(item.getAttribute("idref"));
      if (!href) continue;
      const name = path.posix.normalize(
        path.posix.join(directory, decodeURIComponent(href.split("#")[0])),
      );
      const file = zip.file(name);
      if (!file) continue;
      const html = await file.async("string");
      const doc = parseHTML(html).document;
      const heading =
        doc.querySelector("h1,h2,title")?.textContent ||
        `Bölüm ${chapters.length + 1}`;
      if (textOf(html))
        chapters.push(chapter(heading, doc.body?.innerHTML || html));
    }
    if (!chapters.length)
      throw new Error("EPUB içinde okunabilir bölüm bulunamadı.");
    warnings.push(
      "EPUB metni ve temel biçimler alındı; kapak ve gömülü görseller ayrıca eklenebilir.",
    );
  } else throw new Error("Bu dosya türü desteklenmiyor.");
  return { book: baseBook(title, chapters, extra), warnings };
}
function footnotes(book) {
  const notes = [];
  for (const c of book.chapters) {
    const { document } = parseHTML("<html><body>" + c.html + "</body></html>");
    for (const el of document.querySelectorAll("[data-note]"))
      notes.push({ text: el.textContent, note: el.getAttribute("data-note") });
  }
  return notes;
}
function documentHTML(book) {
  const notes = footnotes(book);
  return (
    '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>' +
    esc(book.title) +
    '</title><style>@page{size:A4;margin:24mm 22mm}body{font-family:Georgia,serif;color:#222;line-height:1.8;max-width:720px;margin:50px auto;font-size:12pt}h1,h2,h3{line-height:1.3}h1{font-size:32pt}header{text-align:center;margin:100px 0;break-after:page}section{break-before:page}img{display:block;margin:24px auto;max-width:100%;height:auto;object-fit:fill;break-inside:avoid}header img{max-height:360px;width:auto;object-fit:contain}@media print{img{max-height:850px}}hr{border:0;text-align:center;margin:2em 0}hr:after{content:"✦   ✦   ✦"}blockquote{border-left:2px solid #aaa;margin-left:0;padding-left:24px}a{color:inherit}p{orphans:3;widows:3}[data-note]{text-decoration:underline dotted}footer{font-size:10pt;color:#555}</style></head><body><header>' +
    (book.cover ? '<img src="' + book.cover + '" alt="Kapak">' : "") +
    "<h1>" +
    esc(book.title) +
    "</h1><p>" +
    esc(book.author) +
    "</p></header>" +
    book.chapters
      .map(
        (c, i) =>
          "<section><small>BÖLÜM " +
          (i + 1) +
          "</small><h2>" +
          esc(c.title) +
          "</h2>" +
          cleanHTML(c.html) +
          "</section>",
      )
      .join("") +
    (notes.length
      ? "<section><h2>Dipnotlar</h2><ol>" +
        notes
          .map(
            (n) =>
              "<li><strong>" +
              esc(n.text) +
              ":</strong> " +
              esc(n.note) +
              "</li>",
          )
          .join("") +
        "</ol></section>"
      : "") +
    "</body></html>"
  );
}
async function docxBuffer(book) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ImageRun,
  } = require("docx");
  const blocks = [];
  const run = (node, style = {}) => {
    if (node.nodeType === 3)
      return [new TextRun({ text: node.textContent, ...style })];
    const tag = node.tagName;
    const next = {
      ...style,
      bold: style.bold || ["B", "STRONG"].includes(tag),
      italics: style.italics || ["I", "EM"].includes(tag),
      strike: style.strike || ["S", "DEL"].includes(tag),
      underline: style.underline || (tag === "U" ? {} : undefined),
      superScript: style.superScript || tag === "SUP",
      subScript: style.subScript || tag === "SUB",
      ...(tag === "CODE" ? { font: "Consolas" } : {}),
    };
    const css = node.style;
    if (css?.fontFamily) next.font = css.fontFamily.replace(/["']/g, "");
    if (css?.fontSize)
      next.size = Math.round(
        parseFloat(css.fontSize) * (css.fontSize.endsWith("px") ? 1.5 : 2),
      );
    const hex = (value) => {
      if (/^#[\da-f]{6}$/i.test(value || "")) return value.slice(1);
      const rgb = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(value || "");
      return rgb
        ? rgb
            .slice(1)
            .map((n) => Math.min(255, +n).toString(16).padStart(2, "0"))
            .join("")
        : undefined;
    };
    if (hex(css?.color)) next.color = hex(css.color);
    if (hex(css?.backgroundColor))
      next.shading = { fill: hex(css.backgroundColor) };
    if (tag === "BR") return [new TextRun({ break: 1 })];
    if (tag === "IMG") {
      const match = /^data:image\/(png|jpeg);base64,(.*)$/s.exec(
        node.getAttribute("src") || "",
      );
      if (match) {
        try {
          const width = Math.max(40, Number(node.getAttribute("width")) || 400);
          const height = Math.max(
            40,
            Number(node.getAttribute("height")) || 280,
          );
          const scale = Math.min(1, 600 / width, 850 / height);
          return [
            new ImageRun({
              data: Buffer.from(match[2], "base64"),
              type: match[1] === "jpeg" ? "jpg" : "png",
              transformation: {
                width: Math.round(width * scale),
                height: Math.round(height * scale),
              },
            }),
          ];
        } catch {}
      }
      return [];
    }
    return [...node.childNodes].flatMap((n) => run(n, next));
  };
  blocks.push(
    new Paragraph({ text: book.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: book.author }),
  );
  for (const c of book.chapters) {
    blocks.push(
      new Paragraph({
        text: c.title,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
    );
    const { document } = parseHTML("<html><body>" + c.html + "</body></html>");
    for (const node of document.body.childNodes) {
      if (["UL", "OL"].includes(node.tagName)) {
        for (const li of node.children)
          blocks.push(
            new Paragraph({
              children: run(li),
              bullet: node.tagName === "UL" ? { level: 0 } : undefined,
              numbering:
                node.tagName === "OL"
                  ? { reference: "numbers", level: 0 }
                  : undefined,
            }),
          );
      } else
        blocks.push(
          new Paragraph({
            children:
              node.tagName === "HR" ? [new TextRun("✦  ✦  ✦")] : run(node),
            heading: /^H[1-6]$/.test(node.tagName)
              ? HeadingLevel["HEADING_" + node.tagName[1]]
              : undefined,
            alignment:
              {
                center: AlignmentType.CENTER,
                right: AlignmentType.RIGHT,
                justify: AlignmentType.JUSTIFIED,
              }[node.style?.textAlign] ||
              (node.tagName === "IMG" ? AlignmentType.CENTER : undefined),
            spacing: {
              after: 180,
              line: node.style?.lineHeight
                ? Math.round(parseFloat(node.style.lineHeight) * 240)
                : 360,
            },
            indent: node.style?.marginLeft
              ? { left: Math.round(parseFloat(node.style.marginLeft) * 15) }
              : undefined,
          }),
        );
    }
  }
  const notes = footnotes(book);
  if (notes.length) {
    blocks.push(
      new Paragraph({ text: "Dipnotlar", heading: HeadingLevel.HEADING_1 }),
    );
    for (const n of notes)
      blocks.push(new Paragraph({ text: n.text + ": " + n.note }));
  }
  return Packer.toBuffer(
    new Document({
      creator: book.author,
      title: book.title,
      styles: { default: { document: { run: { font: "Georgia", size: 24 } } } },
      numbering: {
        config: [
          {
            reference: "numbers",
            levels: [
              { level: 0, format: "decimal", text: "%1.", alignment: "left" },
            ],
          },
        ],
      },
      sections: [{ children: blocks }],
    }),
  );
}
async function exportBuffer(book, format) {
  if (format === "booklean")
    return Buffer.from(
      JSON.stringify({ format: "booklean", version: 1, book }, null, 2),
    );
  if (format === "html") return Buffer.from(documentHTML(book));
  if (format === "txt")
    return Buffer.from(
      "\uFEFF" +
        book.title +
        "\n" +
        book.author +
        "\n\n" +
        book.chapters
          .map((c) => c.title + "\n\n" + textOf(c.html))
          .join("\n\n──────────\n\n"),
    );
  if (format === "md") {
    const Turndown = require("turndown");
    const td = new Turndown({ headingStyle: "atx", bulletListMarker: "-" });
    return Buffer.from(
      "# " +
        book.title +
        "\n\n" +
        book.author +
        "\n\n" +
        book.chapters
          .map((c) => "## " + c.title + "\n\n" + td.turndown(c.html))
          .join("\n\n"),
    );
  }
  if (format === "csv")
    return Buffer.from(
      "\uFEFF" +
        Papa.unparse(
          book.chapters.map((c) => ({
            title: c.title,
            content: textOf(c.html),
            html: c.html,
            status: c.status,
            notes: c.notes,
          })),
          { escapeFormulae: true },
        ),
    );
  if (format === "docx") return docxBuffer(book);
  if (format === "rtf") {
    const encode = (t) =>
      [...t]
        .map((c) => {
          const n = c.charCodeAt(0);
          if (c === "\n") return "\\par\n";
          if (/[{}\\]/.test(c)) return "\\" + c;
          if (n > 127)
            return c
              .split("")
              .map(
                (x) =>
                  "\\u" +
                  (x.charCodeAt(0) > 32767
                    ? x.charCodeAt(0) - 65536
                    : x.charCodeAt(0)) +
                  "?",
              )
              .join("");
          return c;
        })
        .join("");
    return Buffer.from(
      "{\\rtf1\\ansi\\ansicpg1254\\deff0\\uc1{\\fonttbl{\\f0 Georgia;}}\\f0\\fs24 " +
        encode(
          book.title +
            "\n" +
            book.author +
            "\n\n" +
            book.chapters
              .map((c) => c.title + "\n\n" + textOf(c.html))
              .join("\n\n"),
        ) +
        "}",
      "ascii",
    );
  }
  if (format === "epub") {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file(
      "META-INF/container.xml",
      '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    );
    const xhtml = (title, body) =>
      '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="tr"><head><title>' +
      esc(title) +
      "</title></head><body>" +
      body +
      "</body></html>";
    for (let i = 0; i < book.chapters.length; i++) {
      const c = book.chapters[i];
      const html = cleanHTML(c.html)
        .replace(/<img[^>]*>/g, "")
        .replace(/<(br|hr)(\s[^>]*)?>/g, "<$1$2/>");
      zip.file(
        `OEBPS/chapter${i}.xhtml`,
        xhtml(c.title, "<h1>" + esc(c.title) + "</h1>" + html),
      );
    }
    zip.file(
      "OEBPS/nav.xhtml",
      xhtml(
        "İçindekiler",
        '<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc"><h1>İçindekiler</h1><ol>' +
          book.chapters
            .map(
              (c, i) =>
                `<li><a href="chapter${i}.xhtml">${esc(c.title)}</a></li>`,
            )
            .join("") +
          "</ol></nav>",
      ),
    );
    zip.file(
      "OEBPS/content.opf",
      '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:uuid:' +
        book.id +
        "</dc:identifier><dc:title>" +
        esc(book.title) +
        "</dc:title><dc:creator>" +
        esc(book.author) +
        '</dc:creator><dc:language>tr</dc:language><meta property="dcterms:modified">' +
        new Date().toISOString().replace(/\.\d+Z/, "Z") +
        '</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' +
        book.chapters
          .map(
            (_, i) =>
              `<item id="c${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`,
          )
          .join("") +
        "</manifest><spine>" +
        book.chapters.map((_, i) => `<itemref idref="c${i}"/>`).join("") +
        "</spine></package>",
    );
    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }
  if (format === "odt") {
    const zip = new JSZip();
    zip.file("mimetype", "application/vnd.oasis.opendocument.text", {
      compression: "STORE",
    });
    zip.file(
      "META-INF/manifest.xml",
      '<?xml version="1.0"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>',
    );
    zip.file(
      "content.xml",
      '<?xml version="1.0" encoding="utf-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2"><office:body><office:text>' +
        book.chapters
          .map(
            (c) =>
              '<text:h text:outline-level="1">' +
              esc(c.title) +
              "</text:h>" +
              textOf(c.html)
                .split(/\n\n/)
                .map((t) => "<text:p>" + esc(t) + "</text:p>")
                .join(""),
          )
          .join("") +
        "</office:text></office:body></office:document-content>",
    );
    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }
  throw new Error("Desteklenmeyen dışa aktarma biçimi.");
}
module.exports = {
  importFile,
  exportBuffer,
  documentHTML,
  textOf,
  textHTML,
  rtfText,
  esc,
};
