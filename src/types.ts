export type Chapter = {
  id: string;
  title: string;
  html: string;
  status: "draft" | "done";
  notes: string;
  updatedAt: string;
  storyPeriod?: StoryPeriod | null;
};
export type StoryDate = { year: number; month: number; day: number };
export type StoryPeriod = {
  start: StoryDate;
  end: StoryDate | null;
  startTime: string;
  endTime: string;
  note: string;
};
export type StoryCalendar = {
  name: string;
  era: string;
  epochYear: number;
  firstWeekday: number;
  months: { name: string; days: number; season: string }[];
  weekdays: string[];
  leapYear: boolean;
  moonCycle: number;
  moonOffset: number;
};
export type WikiCategory =
  | "civilization"
  | "organization"
  | "history"
  | "culture"
  | "item"
  | "nature"
  | "place"
  | "lore";
export type WikiSection = {
  id: string;
  title: string;
  kind: "text" | "quote" | "image" | "table";
  content: string;
  rows: string[][];
};
export type WikiContent = {
  title: string;
  category: WikiCategory;
  subtype: string;
  group: string;
  tags: string[];
  cover: string;
  summary: string;
  status: "draft" | "complete";
  favorite: boolean;
  attributes: { id: string; name: string; value: string }[];
  sections: WikiSection[];
  relations: { targetId: string; label: string }[];
  chapterIds: string[];
  characterIds: string[];
};
export type WikiEntry = WikiContent & {
  id: string;
  createdAt: string;
  updatedAt: string;
  history: { savedAt: string; content: WikiContent }[];
};
export type StoryEvent = {
  id: string;
  title: string;
  description: string;
  period: StoryPeriod | null;
  kind: "scene" | "history" | "festival" | "journey" | "other";
  status: "planned" | "written" | "complete";
  color: string;
  thread: string;
  location: string;
  weather: string;
  tags: string[];
  recurrence: "none" | "yearly" | "monthly";
  chapterIds: string[];
  characterIds: string[];
  wikiIds: string[];
};
export type Character = {
  id: string;
  name: string;
  role: string;
  description: string;
  traits?: string;
  motivation?: string;
  innerConflict?: string;
  height?: string;
  weight?: string;
  hairColor?: string;
  eyeColor?: string;
  skinColor?: string;
  image?: string;
};
export type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  genres: string[];
  cover: string;
  color: string;
  motif: string;
  chapters: Chapter[];
  characters: Character[];
  notes: string;
  goal: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  deletedAt?: string | null;
  favorite?: boolean;
  lastOpenedAt?: string;
  lastChapterId?: string;
  example?: boolean;
  wiki?: WikiEntry[];
  calendar?: StoryCalendar;
  events?: StoryEvent[];
  storyPeriod?: StoryPeriod | null;
  writerTools?: {
    scenes: { id: string; title: string; summary: string; done: boolean }[];
    revisions: { id: string; text: string; done: boolean }[];
  };
};
export type Library = {
  version: 1;
  books: Book[];
  preferences: {
    theme: string;
    startupAnimation?: boolean;
    bookAnimation?: boolean;
    librarySort?: "manual" | "recent" | "name" | "author" | "words" | "created";
    font: string;
    fontSize: number;
    lineHeight: number;
    dailyGoal: number;
    discordPresence: boolean;
    lastBookId?: string;
  };
  activity: Record<string, number>;
};
export type ExportFormat =
  | "booklean"
  | "txt"
  | "md"
  | "html"
  | "csv"
  | "docx"
  | "pdf"
  | "epub"
  | "odt"
  | "rtf";
export type ImportResult = { book: Book; warnings: string[] };
export type DiscordStatus =
  "disabled" | "connecting" | "waiting" | "connected" | "error";
declare global {
  interface Window {
    booklean: {
      load: () => Promise<{
        library: Library | null;
        recovery?: string;
        dataPath: string;
      }>;
      save: (library: Library) => Promise<{ savedAt: string }>;
      importFile: () => Promise<ImportResult[] | null>;
      exportBook: (
        book: Book,
        format: ExportFormat,
        chapterId?: string,
      ) => Promise<string | null>;
      pickImage: () => Promise<string | null>;
      openDataFolder: () => Promise<void>;
      chooseDataFolder: () => Promise<{
        dataPath: string;
        changed: boolean;
      } | null>;
      setPresence: (
        context: {
          bookTitle: string;
          chapterTitle: string;
          chapterNumber: number;
        } | null,
      ) => Promise<void>;
      getDiscordStatus: () => Promise<DiscordStatus>;
      onDiscordStatus: (
        callback: (status: DiscordStatus) => void,
      ) => () => void;
      listBackups: () => Promise<{ name: string; date: string }[]>;
      createBackup: (
        library: Library,
      ) => Promise<{ name: string; date: string }>;
      readBackup: (name: string) => Promise<Library>;
      deleteBackup: (name: string) => Promise<void>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      onClosing: (callback: () => void) => () => void;
      confirmClose: () => void;
    };
  }
}
