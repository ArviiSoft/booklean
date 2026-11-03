import { useEffect } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import type { Book } from "../types";
import BookCover from "./BookCover";

export function StartupAnimation({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1850);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="launch-scene">
      <div className="launch-orbit" aria-hidden="true">
        <span />
        <span />
        <BookOpen size={44} strokeWidth={1.1} />
      </div>
      <div className="launch-wordmark">
        booklean<span>.</span>
      </div>
      <p>Her hikâye, bir ilk cümleyle başlar.</p>
      <div className="launch-line" aria-hidden="true" />
      <button className="animation-skip" onClick={onDone}>
        Animasyonu geç
      </button>
    </div>
  );
}

export function BookOpening({
  book,
  onDone,
}: {
  book: Book;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1250);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div
      className="book-opening"
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} açılıyor`}
    >
      <div className="opening-glow" />
      <div className="opening-volume" aria-hidden="true">
        <div className="opening-sheet left">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="opening-sheet right">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="opening-cover">
          <BookCover book={book} large />
        </div>
      </div>
      <p className="opening-caption">
        <Sparkles size={15} /> {book.title}
      </p>
      <button autoFocus className="animation-skip" onClick={onDone}>
        Animasyonu geç
      </button>
    </div>
  );
}
