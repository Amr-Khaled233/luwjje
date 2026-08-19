'use client';

import * as React from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';
import { FieldLabel, FieldHint } from '@/components/ui/field';
import { useDash } from './dashboard-i18n';
import { cn } from '@/lib/utils';

export interface UploadedImage {
  url: string;
  alt: string;
  /** The photo's own dimensions, so a frame can be sized to match it. */
  width?: number | null;
  height?: number | null;
  /**
   * The point that must stay in frame, as a percentage of the image.
   * Optional because the logo and the banners are single images that are not
   * stored with a focal point — see the `focus` prop.
   */
  focalX?: number;
  focalY?: number;
  fit?: 'cover' | 'contain';
}

/**
 * Multi-image uploader. Position 1 is the card's primary shot, position 2 the
 * lifestyle image revealed on hover — the order here is the order shown.
 *
 * Every place a product photo appears is a fixed aspect ratio: 3:4 on the card
 * and the detail page, a square in the cart, a strip in the emailed receipt.
 * A centre crop therefore cuts an off-centre subject in half. Rather than a
 * crop tool that would have to be redone per ratio, each image carries a focal
 * point: click the part that matters and it stays in frame everywhere. For a
 * photo that should not be cropped at all, switch it to Fit.
 */
export function ImageUploader({
  value,
  onChange,
  label,
  focus = false,
}: {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  label?: string;
  /**
   * Offer the focal-point and fit controls. Off by default: only product
   * images persist them, and a control that silently does nothing is worse
   * than no control.
   */
  focus?: boolean;
}) {
  const { d } = useDash();
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  async function upload(files: FileList | File[]) {
    if (!files.length) return;
    setUploading(true);
    setError(null);

    const body = new FormData();
    for (const file of Array.from(files)) body.append('files', file);

    try {
      const res = await fetch('/api/dashboard/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? d.images.uploadFailed);

      // Measured here rather than on the server: the browser has already
      // decoded the file, and reading it back covers every format the input
      // accepts without teaching the server to parse image headers.
      const measured = await Promise.all(
        data.urls.map(
          (url: string) =>
            new Promise<UploadedImage>((resolve) => {
              const probe = new window.Image();
              probe.onload = () =>
                resolve({
                  url,
                  alt: '',
                  focalX: 50,
                  focalY: 50,
                  fit: 'cover' as const,
                  width: probe.naturalWidth || null,
                  height: probe.naturalHeight || null,
                });
              // A photo that will not decode still uploads; it simply has no
              // measured shape and falls back to the standard frame.
              probe.onerror = () =>
                resolve({ url, alt: '', focalX: 50, focalY: 50, fit: 'cover' as const });
              probe.src = url;
            }),
        ),
      );

      onChange([...value, ...measured]);
    } catch (err) {
      setError(err instanceof Error ? err.message : d.images.uploadFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const update = (index: number, patch: Partial<UploadedImage>) =>
    onChange(value.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  const focalOf = (img: UploadedImage) => ({ x: img.focalX ?? 50, y: img.focalY ?? 50 });
  const fitOf = (img: UploadedImage) => img.fit ?? 'cover';

  /**
   * The photo's own shape. Falls back to the card's 3:4 for anything uploaded
   * before dimensions were recorded, or that would not decode.
   */
  const ratioOf = (img: UploadedImage) =>
    img.width && img.height ? `${img.width} / ${img.height}` : '3 / 4';

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  /** Turns a click anywhere on the preview into a focal percentage. */
  function setFocal(index: number, event: React.MouseEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const focalX = Math.round(((event.clientX - box.left) / box.width) * 100);
    const focalY = Math.round(((event.clientY - box.top) / box.height) * 100);
    update(index, {
      focalX: Math.min(100, Math.max(0, focalX)),
      focalY: Math.min(100, Math.max(0, focalY)),
    });
  }

  return (
    <div>
      <FieldLabel>{label ?? d.common.images}</FieldLabel>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors',
          dragOver ? 'border-navy bg-surface-low' : 'border-outline-variant hover:border-outline',
        )}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-secondary" />
        ) : (
          <Upload className="h-5 w-5 text-secondary" />
        )}
        <p className="mt-3 text-body-sm text-secondary">
          {uploading ? d.images.uploading : d.images.drop}
        </p>
        <p className="mt-1 text-body-sm text-tertiary">{d.images.formats}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-body-sm text-error">{error}</p>}

      {value.length > 0 && (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {value.map((img, i) => {
              const focal = focalOf(img);
              const fit = fitOf(img);

              return (
                <li key={img.url + i} className="border border-outline-variant bg-surface-lowest">
                  {/*
                    The preview is the real 3:4 frame with the real fit and
                    focal point applied, so it is not a guess at what the
                    product card will end up showing.
                  */}
                  <div
                    role={focus ? 'button' : undefined}
                    tabIndex={focus ? 0 : undefined}
                    onClick={focus ? (e) => setFocal(i, e) : undefined}
                    aria-label={focus ? d.images.setFocal : undefined}
                    style={{ aspectRatio: ratioOf(img) }}
                    className={cn(
                      'group relative block w-full overflow-hidden bg-surface-low',
                      focus && 'cursor-crosshair',
                    )}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      sizes="280px"
                      className="object-cover"
                      style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                    />

                    {focus && (
                      <>
                        <span
                          aria-hidden
                          style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
                          className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background opacity-70 transition-opacity group-hover:opacity-100"
                        >
                          <span className="absolute inset-[5px] rounded-full bg-navy" />
                        </span>
                        <span className="label-caps pointer-events-none absolute inset-x-0 bottom-0 bg-navy/85 py-1.5 text-center text-background opacity-0 transition-opacity group-hover:opacity-100">
                          {d.images.clickToFocus}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 border-t border-outline-variant p-2">
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      aria-label={d.images.moveEarlier}
                      className="label-caps px-1.5 text-secondary disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === value.length - 1}
                      aria-label={d.images.moveLater}
                      className="label-caps px-1.5 text-secondary disabled:opacity-30"
                    >
                      →
                    </button>

                    <button
                      type="button"
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                      aria-label={d.common.remove}
                      className="ms-auto flex h-7 w-7 items-center justify-center text-tertiary transition-colors hover:text-error"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 border-t border-outline-variant px-2 py-1.5">
                    <span className="label-caps shrink-0 text-tertiary">
                      {i === 0 ? d.images.primary : i === 1 ? d.images.hover : `#${i + 1}`}
                    </span>
                    <input
                      value={img.alt}
                      onChange={(e) => update(i, { alt: e.target.value })}
                      placeholder={d.images.altText}
                      className="min-w-0 flex-1 border-0 bg-transparent px-1 text-body-sm outline-none placeholder:text-tertiary"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {focus && <FieldHint>{d.images.hint}</FieldHint>}
        </>
      )}
    </div>
  );
}
