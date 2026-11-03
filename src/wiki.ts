import type { WikiCategory, WikiContent, WikiEntry } from "./types";
import { now, uid } from "./model";
export const categories: {
  id: WikiCategory;
  name: string;
  description: string;
  subtypes: string[];
  attributes: string[];
}[] = [
  {
    id: "civilization",
    name: "Medeniyetler",
    description: "Halklar, devletler ve uygarlıklar",
    subtypes: ["Krallık", "İmparatorluk", "Halk", "Şehir devleti", "Kabile"],
    attributes: [
      "Yönetim biçimi",
      "Başkent",
      "Nüfus",
      "Dil",
      "İnanç",
      "Ekonomi",
    ],
  },
  {
    id: "organization",
    name: "Örgütler",
    description: "Loncalar, hanedanlar ve topluluklar",
    subtypes: ["Lonca", "Hanedan", "Tarikat", "Ordu", "Gizli örgüt"],
    attributes: ["Lider", "Kuruluş", "Merkez", "Amaç", "Üyelik", "Müttefikler"],
  },
  {
    id: "history",
    name: "Tarih",
    description: "Çağlar, savaşlar ve dönüm noktaları",
    subtypes: ["Çağ", "Savaş", "Antlaşma", "Keşif", "Felaket"],
    attributes: [
      "Dönem",
      "Nedenler",
      "Taraflar",
      "Önemli kişiler",
      "Sonuçlar",
      "Kaynaklar",
    ],
  },
  {
    id: "culture",
    name: "Kültür",
    description: "Gelenekler, diller ve inançlar",
    subtypes: ["Gelenek", "Festival", "Dil", "Din", "Sanat", "Mutfak"],
    attributes: [
      "Uygulayıcılar",
      "Köken",
      "Anahtar semboller",
      "Kutlama tarihi",
      "Kurallar",
      "Bölgesel farklar",
    ],
  },
  {
    id: "item",
    name: "Nesneler",
    description: "Eserler, silahlar ve teknolojiler",
    subtypes: ["Eser", "Silah", "Araç", "Teknoloji", "Belge"],
    attributes: [
      "Sahibi",
      "Yaratıcısı",
      "Malzeme",
      "Güçler",
      "Sınırlamalar",
      "Bulunduğu yer",
    ],
  },
  {
    id: "nature",
    name: "Doğa",
    description: "Türler, bitkiler ve coğrafya",
    subtypes: ["Canlı türü", "Bitki", "Yaratık", "Biyom", "Doğa olayı"],
    attributes: [
      "Yaşam alanı",
      "Görünüm",
      "Davranış",
      "Beslenme",
      "Yaşam döngüsü",
      "Tehlikeler",
    ],
  },
  {
    id: "place",
    name: "Mekânlar",
    description: "Kıtalar, şehirler ve gizli yerler",
    subtypes: ["Kıta", "Ülke", "Şehir", "Yapı", "Bölge", "Gizli yer"],
    attributes: [
      "Konum",
      "İklim",
      "Nüfus",
      "Yönetim",
      "Önemli yapılar",
      "Ulaşım",
    ],
  },
  {
    id: "lore",
    name: "Evren bilgisi",
    description: "Büyü, kozmoloji ve dünyanın kuralları",
    subtypes: ["Büyü sistemi", "Kozmoloji", "Efsane", "Kural", "Diğer"],
    attributes: [
      "Köken",
      "İşleyiş",
      "Bedel",
      "Sınırlar",
      "İstisnalar",
      "Hikâyeye etkisi",
    ],
  },
];
export const contentOf = ({
  id,
  createdAt,
  updatedAt,
  history,
  ...content
}: WikiEntry): WikiContent => content;
export function newEntry(category: WikiCategory): WikiEntry {
  return {
    id: uid(),
    title: "",
    category,
    subtype: "",
    group: "",
    tags: [],
    cover: "",
    summary: "",
    status: "draft",
    favorite: false,
    attributes: categories
      .find((c) => c.id === category)!
      .attributes.map((name) => ({ id: uid(), name, value: "" })),
    sections: [
      { id: uid(), title: "Öyküsü", kind: "text", content: "", rows: [] },
    ],
    relations: [],
    chapterIds: [],
    characterIds: [],
    createdAt: now(),
    updatedAt: now(),
    history: [],
  };
}
