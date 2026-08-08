import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates on-brand SVG stand-ins for product photography so the store looks
 * right the moment it is seeded — no network, no binary assets in the repo.
 * The admin replaces these with real uploads from Admin → Products.
 */

const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'products');

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Blend `hex` toward white by `amount` (0..1). */
function tint(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function shade(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (c: number) => Math.round(c * (1 - amount));
  return `#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

const SERIF = "Playfair Display, Georgia, 'Times New Roman', serif";
const SANS = "Inter, Helvetica, Arial, sans-serif";

/** Front-of-product shot: color field, inset rule, name at the base. */
function studioSvg(name: string, colorName: string, hex: string) {
  const bg = tint(hex, isLight(hex) ? 0.35 : 0.72);
  const block = tint(hex, isLight(hex) ? 0.05 : 0.32);
  const ink = isLight(hex) ? '#0b1c30' : '#0b1c30';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200">
  <rect width="900" height="1200" fill="${bg}"/>
  <rect x="150" y="140" width="600" height="760" fill="${block}"/>
  <rect x="150" y="140" width="600" height="760" fill="none" stroke="${shade(hex, 0.15)}" stroke-opacity="0.25" stroke-width="1"/>
  <path d="M150 640 H750" stroke="${shade(hex, 0.2)}" stroke-opacity="0.18" stroke-width="1"/>
  <circle cx="450" cy="420" r="130" fill="${shade(hex, 0.08)}" fill-opacity="0.35"/>
  <text x="450" y="1010" text-anchor="middle" font-family="${SERIF}" font-size="42" fill="${ink}">${escapeXml(name)}</text>
  <text x="450" y="1058" text-anchor="middle" font-family="${SANS}" font-size="20" letter-spacing="2.4" fill="#565e74">${escapeXml(colorName.toUpperCase())}</text>
</svg>`;
}

/** Lifestyle shot revealed on card hover: different composition, same palette. */
function lifestyleSvg(name: string, hex: string) {
  const bg = tint(hex, isLight(hex) ? 0.12 : 0.5);
  const band = tint(hex, isLight(hex) ? 0.5 : 0.82);
  const ink = '#0b1c30';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200">
  <rect width="900" height="1200" fill="${bg}"/>
  <rect x="0" y="0" width="900" height="470" fill="${band}"/>
  <rect x="0" y="900" width="900" height="300" fill="${shade(hex, 0.12)}" fill-opacity="0.22"/>
  <path d="M0 470 H900" stroke="${shade(hex, 0.25)}" stroke-opacity="0.25" stroke-width="1"/>
  <rect x="330" y="330" width="240" height="540" fill="${tint(hex, 0.02)}" fill-opacity="0.55"/>
  <text x="60" y="240" font-family="${SERIF}" font-size="54" fill="${ink}" fill-opacity="0.85">${escapeXml(name)}</text>
  <text x="60" y="290" font-family="${SANS}" font-size="18" letter-spacing="3" fill="#565e74">LUWJJE STUDIO</text>
</svg>`;
}

/** Wide editorial image for hero / offer banners and page heroes. */
function editorialSvg(label: string, hex: string) {
  const bg = tint(hex, 0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tint(hex, 0.72)}"/>
      <stop offset="100%" stop-color="${shade(hex, 0.12)}"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="${bg}"/>
  <rect width="1920" height="1080" fill="url(#g)" fill-opacity="0.85"/>
  <rect x="120" y="120" width="1680" height="840" fill="none" stroke="#f8f9ff" stroke-opacity="0.28" stroke-width="1"/>
  <circle cx="1420" cy="540" r="300" fill="#f8f9ff" fill-opacity="0.10"/>
  <circle cx="420" cy="820" r="180" fill="#0b1c30" fill-opacity="0.08"/>
  <text x="120" y="1010" font-family="${SANS}" font-size="22" letter-spacing="4" fill="#0b1c30" fill-opacity="0.55">${escapeXml(label.toUpperCase())}</text>
</svg>`;
}

function write(filename: string, contents: string) {
  fs.writeFileSync(path.join(OUT_DIR, filename), contents, 'utf8');
  return `/images/products/${filename}`;
}

export function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
}

export function makeProductImages(slug: string, name: string, colorName: string, hex: string) {
  return {
    primary: write(`${slug}.svg`, studioSvg(name, colorName, hex)),
    hover: write(`${slug}-alt.svg`, lifestyleSvg(name, hex)),
  };
}

export function makeEditorial(slug: string, label: string, hex: string) {
  return write(`${slug}.svg`, editorialSvg(label, hex));
}
