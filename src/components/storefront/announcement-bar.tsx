/**
 * The marketing strip above the header. Shop-controlled: the copy and whether
 * it shows at all come from Settings. The line scrolls as a seamless marquee
 * so it reads without wrapping; hovering pauses it, and reduced motion leaves
 * it at rest.
 */
export function AnnouncementBar({ text }: { text: string }) {
  const message = text.trim();
  if (!message) return null;

  // Two identical tracks sit side by side and both slide left by their own
  // width, so the second takes the first's place seamlessly. `aria-hidden` on
  // the copies keeps the line from being read out several times.
  return (
    <div className="overflow-hidden bg-navy text-background" role="region" aria-label={message}>
      <div className="announce-marquee flex w-max">
        {[0, 1].map((track) => (
          <div key={track} className="announce-track flex shrink-0" aria-hidden={track === 1}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className="whitespace-nowrap px-6 py-1.5 text-[12px] font-medium tracking-wide sm:px-8 sm:py-2.5 sm:text-[15px]"
              >
                {message}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
