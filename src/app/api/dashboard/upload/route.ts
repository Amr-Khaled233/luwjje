import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { isDashboardUser } from '@/lib/dashboard-auth';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/svg+xml', '.svg'],
]);

/**
 * Stores product imagery.
 *
 * On Vercel the filesystem is ephemeral and read-only, so uploads go to Vercel
 * Blob whenever BLOB_READ_WRITE_TOKEN is present. Without it — local dev, or a
 * self-hosted box with a persistent disk — files are written to
 * public/uploads. Either way the response is a plain public URL.
 */
export async function POST(req: Request) {
  if (!(await isDashboardUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll('files').filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files received.' }, { status: 400 });
  }

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `${file.name}: only JPG, PNG, WebP, AVIF and SVG are accepted.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `${file.name} is larger than 8MB.` }, { status: 400 });
    }
  }

  const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  try {
    const urls = useBlob ? await uploadToBlob(files) : await uploadToDisk(files);
    return NextResponse.json({ urls });
  } catch (err) {
    console.error('upload failed', err);
    return NextResponse.json(
      {
        error: useBlob
          ? 'Could not reach blob storage. Check BLOB_READ_WRITE_TOKEN.'
          : 'Could not write the file. On a serverless host, connect a Blob store.',
      },
      { status: 500 },
    );
  }
}

async function uploadToBlob(files: File[]) {
  const { put } = await import('@vercel/blob');

  return Promise.all(
    files.map(async (file) => {
      // Generated name — never trust the client-supplied filename.
      const ext = ALLOWED.get(file.type)!;
      const { url } = await put(`products/${randomUUID()}${ext}`, file, {
        access: 'public',
        contentType: file.type,
      });
      return url;
    }),
  );
}

async function uploadToDisk(files: File[]) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    const filename = `${randomUUID()}${ALLOWED.get(file.type)}`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    urls.push(`/uploads/${filename}`);
  }
  return urls;
}
