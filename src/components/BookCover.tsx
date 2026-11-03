import type { Book } from "../types";
import CoverMotif from "./CoverMotif";
export default function BookCover({
  book,
  large = false,
}: {
  book: Pick<Book, "cover" | "title" | "author" | "color" | "motif">;
  large?: boolean;
}) {
  return (
    <div
      className={`book-object ${large ? "large" : ""}`}
      style={{ "--cover-color": book.color } as React.CSSProperties}
    >
      <div className={`book-face motif-${book.motif}`}>
        {book.cover ? (
          <img
            src={book.cover}
            alt={`${book.title} kapağı`}
            draggable={false}
          />
        ) : (
          <>
            <div className="cover-frame" />
            <div className="cover-art">
              <CoverMotif motif={book.motif} />
            </div>
            <div className="cover-title">
              {book.title || "Henüz yazılmamış bir hikâye"}
            </div>
            <div className="cover-author">{book.author || "YAZAR ADI"}</div>
            <div className="cover-publisher">b.</div>
          </>
        )}
      </div>
      <div className="book-pages" />
    </div>
  );
}
