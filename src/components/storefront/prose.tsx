import { cn } from '@/lib/utils';

/**
 * Minimal renderer for the admin-editable page bodies: `## ` headings,
 * blank-line-separated paragraphs. Everything is escaped by React, so page
 * content can never inject markup.
 */
export function Prose({ body, className }: { body: string; className?: string }) {
  const blocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="mt-6 font-display text-headline-sm first:mt-0">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith('# ')) {
          return (
            <h2 key={i} className="mt-6 font-display text-headline-md first:mt-0">
              {block.slice(2)}
            </h2>
          );
        }
        if (/^[-*]\s/.test(block)) {
          const bullets = block.split('\n').map((l) => l.replace(/^[-*]\s/, ''));
          return (
            <ul key={i} className="flex list-disc flex-col gap-2 pl-5 text-body-lg leading-8 text-secondary">
              {bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line text-body-lg leading-8 text-secondary">
            {block}
          </p>
        );
      })}
    </div>
  );
}
