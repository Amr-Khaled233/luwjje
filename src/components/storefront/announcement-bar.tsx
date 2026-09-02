/**
 * The marketing strip above the header. Shop-controlled: the copy and whether
 * it shows at all come from Settings. One large, centred line that fades in,
 * holds long enough to read, then fades out and repeats. Hovering the bar
 * freezes it fully visible so it can be read at leisure; reduced-motion
 * viewers simply see it at rest. The message is never repeated side by side.
 */
export function AnnouncementBar({ text }: { text: string }) {
  const message = text.trim();
  if (!message) return null;

  return (
    <div className="announce-bar bg-navy text-background">
      <div className="container-luwjje flex min-h-[3.5rem] items-center justify-center px-4 py-2.5 text-center md:min-h-[4rem]">
        <p className="announce-line font-display text-xl font-semibold tracking-wide sm:text-2xl md:text-[26px]">
          {message}
        </p>
      </div>
    </div>
  );
}
