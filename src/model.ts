import type { Book, Chapter, Library } from "./types";
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function plain(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, "</$1> ")
    .replace(/<br\s*\/?\s*>/gi, " ");
  return div.textContent || "";
}
export const words = (html: string) =>
  plain(html)
    .trim()
    .match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length || 0;
export const bookWords = (book: Book) =>
  book.chapters.reduce((n, c) => n + words(c.html), 0);
export const fmt = (n: number) => n.toLocaleString("tr-TR");
export const newChapter = (title = "Adsız bölüm"): Chapter => ({
  id: uid(),
  title,
  html: "<p></p>",
  status: "draft",
  notes: "",
  updatedAt: now(),
});
export const newBook = (): Book => ({
  id: uid(),
  title: "",
  author: "",
  description: "",
  genres: [],
  cover: "",
  color: "#314c48",
  motif: "orbit",
  chapters: [newChapter("İlk sayfa")],
  characters: [],
  notes: "",
  goal: 50000,
  createdAt: now(),
  updatedAt: now(),
  archived: false,
});
export function initialLibrary(): Library {
  return {
    version: 1,
    books: [],
    preferences: {
      theme: "dark",
      font: "Georgia",
      fontSize: 19,
      lineHeight: 1.9,
      dailyGoal: 500,
      discordPresence: true,
    },
    activity: {},
  };
}
