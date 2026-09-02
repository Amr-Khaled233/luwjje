/**
 * The marketing strip above the header. Shop-controlled: the copy and whether
 * it shows at all come from Settings. One clear, centred line — a small pulsing
 * mark on each side draws the eye without the message ever repeating.
 */
export function AnnouncementBar({ text }: { text: string }) {
  const message = text.trim();
  if (!message) return null;

  return (
    <div className="bg-navy text-background">
      <div className="container-luwjje flex items-center justify-center gap-3 py-2.5 text-center sm:gap-4">
        <span className="hidden h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-background/60 sm:block" aria-hidden />
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] sm:text-[15px]">
          {message}
        </p>
        <span className="hidden h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-background/60 sm:block" aria-hidden />
      </div>
    </div>
  );
}
