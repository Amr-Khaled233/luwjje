'use client';

import * as React from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { FieldLabel, FieldHint } from '@/components/ui/field';
import { useDash } from './dashboard-i18n';
import { cn } from '@/lib/utils';

export interface UploadedImage {
  url: string;
  alt: string;
}

/**
 * Multi-image uploader. Position 1 is the card's primary shot; the rest fill
 * the product-page gallery — the order here is the order shown.
 *
 * A photo is shown exactly as it was uploaded, at its own shape. There is
 * nothing to crop, position or configure: the focal point and the fill/fit
 * switch existed only to manage a fixed frame the storefront no longer
 * imposes, and they are gone with it.
 */
export function ImageUploader({
  value,
  onChange,
  label,
  hint,
}: {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  label?: string;
  /** Shown under the previews. Only the product form has two images to explain. */
  hint?: string;
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
      onChange([...value, ...data.urls.map((url: string) => ({ url, alt: '' }))]);
    } catch (err) {
      setError(err instanceof Error ? err.message : d.images.uploadFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const update = (index: number, patch: Partial<UploadedImage>) =>
    onChange(value.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
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
        {/* The one thing worth knowing before picking a photo. */}
        <p className="mt-1 text-body-sm text-tertiary">{d.images.bestSize}</p>
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
            {value.map((img, i) => (
              <li key={img.url + i} className="border border-outline-variant bg-surface-lowest">
                {/*
                  A plain <img> rather than next/image: this previews a file
                  that has just been uploaded, and letting the browser lay it
                  out at its own size is exactly what the storefront does with
                  it — so what is shown here is what will be shown there.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="block h-auto w-full bg-surface-low" />

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

                  <span className="label-caps ms-1 text-tertiary">
                    {i === 0 ? d.images.primary : d.images.gallery}
                  </span>

                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    aria-label={d.common.remove}
                    className="ms-auto flex h-7 w-7 items-center justify-center text-tertiary transition-colors hover:text-error"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="border-t border-outline-variant px-2 py-1.5">
                  <input
                    value={img.alt}
                    onChange={(e) => update(i, { alt: e.target.value })}
                    placeholder={d.images.altText}
                    className="w-full border-0 bg-transparent px-1 text-body-sm outline-none placeholder:text-tertiary"
                  />
                </div>
              </li>
            ))}
          </ul>
          {hint && <FieldHint>{hint}</FieldHint>}
        </>
      )}
    </div>
  );
}
