'use client';

import * as React from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, GripVertical } from 'lucide-react';
import { FieldLabel, FieldHint } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export interface UploadedImage {
  url: string;
  alt: string;
}

/**
 * Multi-image uploader. Position 1 is the card's primary shot, position 2 the
 * lifestyle image revealed on hover — the order here is the order shown.
 */
export function ImageUploader({
  value,
  onChange,
  label = 'Images',
}: {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  label?: string;
}) {
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
      if (!res.ok) throw new Error(data.error ?? 'Upload failed.');
      onChange([...value, ...data.urls.map((url: string) => ({ url, alt: '' }))]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>

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
          {uploading ? 'Uploading…' : 'Drop images here, or click to choose'}
        </p>
        <p className="mt-1 text-body-sm text-tertiary">JPG, PNG, WebP, AVIF or SVG · max 8MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-body-sm text-error">{error}</p>}

      {value.length > 0 && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {value.map((img, i) => (
              <li key={img.url + i} className="border border-outline-variant bg-surface-lowest">
                <div className="relative aspect-[3/4] w-full bg-surface-low">
                  <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    aria-label="Remove image"
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center border border-navy bg-background transition-colors hover:bg-error hover:text-background"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {i === 0 && (
                    <span className="label-caps absolute bottom-1.5 left-1.5 border border-navy bg-navy px-2 py-0.5 text-background">
                      Primary
                    </span>
                  )}
                  {i === 1 && (
                    <span className="label-caps absolute bottom-1.5 left-1.5 border border-navy bg-background px-2 py-0.5">
                      Hover
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 border-t border-outline-variant p-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-tertiary" />
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="label-caps px-1.5 text-secondary disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === value.length - 1}
                    className="label-caps px-1.5 text-secondary disabled:opacity-30"
                  >
                    →
                  </button>
                  <input
                    value={img.alt}
                    onChange={(e) =>
                      onChange(value.map((v, j) => (j === i ? { ...v, alt: e.target.value } : v)))
                    }
                    placeholder="Alt text"
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 text-body-sm outline-none placeholder:text-tertiary"
                  />
                </div>
              </li>
            ))}
          </ul>
          <FieldHint>
            The first image is the product card&rsquo;s primary shot; the second is revealed on
            hover. Use the arrows to reorder.
          </FieldHint>
        </>
      )}
    </div>
  );
}
