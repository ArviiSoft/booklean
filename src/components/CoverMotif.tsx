import type { ReactNode } from "react";
export default function CoverMotif({ motif }: { motif: string }) {
  let drawing: ReactNode;
  switch (motif) {
    case "sun":
      drawing = (
        <>
          <circle cx="50" cy="50" r="20" />
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M50 16V7 M47 20H53"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </>
      );
      break;
    case "moon":
      drawing = (
        <>
          <path d="M65 17A35 35 0 1 0 79 71 31 31 0 0 1 65 17Z" />
          <path d="m70 32 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
        </>
      );
      break;
    case "mountains":
      drawing = (
        <>
          <path d="M7 77 37 24 66 77ZM45 77 67 39 91 77M26 44l11 7 10-8M59 53l8 6 7-7" />
          <circle cx="74" cy="22" r="8" />
          <path d="M8 84h84" />
        </>
      );
      break;
    case "waves":
      drawing = (
        <>
          {[32, 46, 60, 74].map((y) => (
            <path key={y} d={`M6 ${y}q11-16 22 0t22 0 22 0 22 0`} />
          ))}
          <circle cx="50" cy="16" r="7" />
        </>
      );
      break;
    case "botanical":
      drawing = (
        <>
          <path d="M48 90V20M48 71C9 72 11 49 11 49c23-1 37 9 37 22ZM48 53c37 0 38-24 38-24-22-1-38 10-38 24ZM48 33C25 32 27 11 27 11c17 0 21 10 21 22Z" />
        </>
      );
      break;
    case "diamond":
      drawing = (
        <>
          <path d="m50 6 37 44-37 44L13 50ZM13 50h74M50 6 35 50l15 44 15-44ZM35 50h30" />
        </>
      );
      break;
    case "compass":
      drawing = (
        <>
          <circle cx="50" cy="50" r="32" />
          <path d="m50 5 8 37 37 8-37 8-8 37-8-37-37-8 37-8ZM28 28l44 44M72 28 28 72" />
          <circle cx="50" cy="50" r="4" />
        </>
      );
      break;
    case "stars":
      drawing = (
        <>
          <path d="m15 69 19-44 28 14 21-24-9 60-40-50M15 69l59 6" />
          {[
            [15, 69],
            [34, 25],
            [62, 39],
            [83, 15],
            [74, 75],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="3" fill="currentColor" />
          ))}
        </>
      );
      break;
    case "feather":
      drawing = (
        <>
          <path d="M20 89 74 17M29 74C2 39 49 7 80 11c8 30-11 69-51 63ZM40 61l-6-25M50 48l23-2M58 37l-3-19" />
        </>
      );
      break;
    case "hourglass":
      drawing = (
        <>
          <path d="M25 10h50M25 90h50M30 10c0 21 5 27 20 40-15 13-20 19-20 40M70 10c0 21-5 27-20 40 15 13 20 19 20 40M34 22h32L50 43ZM35 81l15-19 15 19Z" />
          <path d="M50 48v7" strokeDasharray="1 3" />
        </>
      );
      break;
    case "deco":
      drawing = (
        <>
          <path d="M50 91V10L13 31v36l37 24 37-24V31L50 10M50 27 25 41v19l25 15 25-15V41ZM50 44 38 51v6l12 7 12-7v-6Z" />
        </>
      );
      break;
    case "labyrinth":
      drawing = (
        <>
          <path d="M50 90H10V10h80v80H65V36H36v29h14V50M24 77V23h53v54M50 90V77H36" />
        </>
      );
      break;
    case "arch":
      drawing = (
        <>
          <path d="M17 88V45a33 33 0 0 1 66 0v43ZM29 88V46a21 21 0 0 1 42 0v42ZM41 88V47a9 9 0 0 1 18 0v41Z" />
        </>
      );
      break;
    case "lines":
      drawing = (
        <>
          {[0, 15, 30].map((r) => (
            <rect
              key={r}
              x="25"
              y="25"
              width="50"
              height="50"
              transform={`rotate(${45 + r} 50 50)`}
            />
          ))}
        </>
      );
      break;
    default:
      drawing = (
        <>
          {[0, 60, 120].map((r) => (
            <ellipse
              key={r}
              cx="50"
              cy="50"
              rx="22"
              ry="38"
              transform={`rotate(${r} 50 50)`}
            />
          ))}
          <path d="m50 40 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="currentColor" />
        </>
      );
  }
  return (
    <svg
      className="cover-motif"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {drawing}
    </svg>
  );
}
