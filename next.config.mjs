/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Restricted on purpose: a wildcard host turns the image optimiser into an
    // open proxy. Add a pattern here if you start serving images elsewhere.
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
