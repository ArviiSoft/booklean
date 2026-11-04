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
const chapterCounts = new WeakMap<Chapter, { html: string; count: number }>();
export function chapterWords(chapter: Chapter) {
  const cached = chapterCounts.get(chapter);
  if (cached?.html === chapter.html) return cached.count;
  const count = words(chapter.html);
  chapterCounts.set(chapter, { html: chapter.html, count });
  return count;
}
export const bookWords = (book: Book) =>
  book.chapters.reduce((n, c) => n + chapterWords(c), 0);
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
  const sample = newBook();
  Object.assign(sample, {
    title: "Geceye Bırakılan Mektuplar",
    author: "Booklean",
    genres: ["Edebiyat", "Gizem"],
    description:
      "Eski bir kitapçı, gönderilmemiş bir mektup ve yeniden başlamanın küçük cesareti. Bu örnek proje, yazı odanızı keşfetmeniz için hazırlandı.",
    example: true,
    goal: 30000,
  });
  sample.chapters = [
    {
      ...newChapter("Bir kitapçının ışığı"),
      html: "<p>Yağmur, şehrin bütün seslerini yumuşatmıştı. Deniz, köşedeki kitapçının önünde durduğunda saatin kaç olduğunu bilmiyordu. Vitrindeki küçük lamba hâlâ yanıyordu; sanki biri, birinin gelmesini bekliyordu.</p><p>Kapıyı açınca tanıdık bir koku karşıladı onu: eski kâğıt, biraz kahve, biraz da unutulmuş zaman. Tezgâhın üzerinde, kapağı orman yeşili bir defter duruyordu. İçinden sararmış bir zarfın ucu görünüyordu.</p><p>Üzerinde yalnızca iki kelime vardı.</p><p><em>Bir gün.</em></p><p>Deniz zarfı eline aldı. Bazı hikâyelerin ilk cümlesi yazılmazdı. Bazı hikâyeler, bir kapıyı açmakla başlardı.</p><hr/><p><em>Burası sizin yazı odanız.</em> Bu örneği düzenleyebilir ya da kitaplığınıza dönüp kendi kitabınızı oluşturabilirsiniz. Bölümlerinizi soldan yönetin; bir metin seçtiğinizde biçimlendirme araçları hemen yanınızda belirir. Siz yazarken Booklean değişikliklerinizi bilgisayarınıza kaydeder.</p>",
    },
    newChapter("Gönderilmemiş bir mektup"),
  ];
  return {
    version: 1,
    books: [sample],
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
