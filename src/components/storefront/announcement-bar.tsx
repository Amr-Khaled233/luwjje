/**
 * The marketing strip above the header. Shop-controlled: the copy and whether
 * it shows at all come from Settings. The line scrolls as a marquee so a long
 * message reads without wrapping; under reduced motion it sits still and
 * centred instead.
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
                className="whitespace-nowrap px-8 py-2 text-label-md font-medium tracking-wide"
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
