import "server-only";
import sharp from "sharp";
import path from "path";
import { readFile } from "fs/promises";

const TARGET_WIDTH = 1600;
const TARGET_HEIGHT = 900;

export async function smartCropTo16x9(input: Buffer): Promise<{ buffer: Buffer; contentType: string }> {
  return smartCropTo(input, TARGET_WIDTH, TARGET_HEIGHT);
}

export async function smartCropTo(input: Buffer, width: number, height: number): Promise<{ buffer: Buffer; contentType: string }> {
  const buffer = await sharp(input)
    .rotate()
    .resize(width, height, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return { buffer, contentType: "image/jpeg" };
}

export function shouldSkipCropping(mimeType: string): boolean {
  return mimeType === "image/svg+xml";
}

// ---------------------------------------------------------------------------
// Branded featured-image generation
// ---------------------------------------------------------------------------

const HERO_SIZE = { width: 1600, height: 900 };
const SOCIAL_SIZE = { width: 1080, height: 1350 };
const TEAL = "#B8FFEB";
const FONT_FAMILY = "Plus Jakarta Sans ExtraBold";

// Advance widths (fraction of font-size) read directly from the pinned
// ExtraBold static instance's glyph metrics — keeps title wrapping
// pixel-accurate without a canvas/DOM on the server.
const CHAR_W: Record<string, number> = {
  A: 0.732, B: 0.69, C: 0.772, D: 0.739, E: 0.589, F: 0.587, G: 0.804, H: 0.732,
  I: 0.287, J: 0.396, K: 0.687, L: 0.547, M: 0.912, N: 0.742, O: 0.878, P: 0.649,
  Q: 0.878, R: 0.667, S: 0.647, T: 0.552, U: 0.724, V: 0.712, W: 1.032, X: 0.682,
  Y: 0.672, Z: 0.567, "0": 0.7, "1": 0.413, "2": 0.596, "3": 0.612, "4": 0.662,
  "5": 0.614, "6": 0.604, "7": 0.564, "8": 0.633, "9": 0.604, " ": 0.18,
  ".": 0.408, ",": 0.386, "'": 0.333, '"': 0.532, "-": 0.634, ":": 0.408,
  ";": 0.428, "!": 0.4, "?": 0.611, "&": 0.813, "/": 0.532,
};
const FALLBACK_W = 0.65;

// Small safety margin on top of the measured glyph widths — cheap
// insurance against minor font-substitution mismatches.
const WRAP_SAFETY = 1.1;

function textWidth(s: string, fontSize: number): number {
  let w = 0;
  for (const ch of s) w += (CHAR_W[ch] ?? FALLBACK_W) * fontSize;
  return w * WRAP_SAFETY;
}

function wrapTitle(title: string, fontSize: number, maxWidth: number): string[][] {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  let current: string[] = [];
  for (const w of words) {
    const trial = [...current, w].join(" ");
    if (current.length && textWidth(trial, fontSize) > maxWidth) {
      lines.push(current);
      current = [w];
    } else {
      current.push(w);
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

let whiteLogoPromise: Promise<Buffer> | null = null;

// Recolors the brand mark to solid white using its own alpha channel as a
// mask, so it reads clearly on the dark photo scrim regardless of context.
async function getWhiteLogoBuffer(): Promise<Buffer> {
  if (!whiteLogoPromise) {
    whiteLogoPromise = (async () => {
      const logoPath = path.join(process.cwd(), "public", "brand-mark.png");
      const src = sharp(await readFile(logoPath)).ensureAlpha();
      const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
      const white = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i += 4) {
        white[i] = 255;
        white[i + 1] = 255;
        white[i + 2] = 255;
        white[i + 3] = data[i + 3];
      }
      return sharp(white, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toBuffer();
    })();
  }
  return whiteLogoPromise;
}

const MAX_LINES = 3;

function buildOverlaySvg(
  width: number,
  height: number,
  category: string,
  title: string,
  logoDataUri: string,
  logoW: number,
  logoH: number
): string {
  const margin = Math.round(width * 0.055);
  const logoTop = Math.round(height * 0.045);
  const catSize = Math.round(width * 0.02);
  const maxTextW = width - margin * 2;
  const centerX = width / 2;

  // Auto-shrink: start at the intended size and step down if the title
  // still doesn't fit within MAX_LINES, instead of letting it overflow.
  let fontSize = Math.round(width * 0.052);
  let lineGap = Math.round(fontSize * 1.12);
  let lines = wrapTitle(title, fontSize, maxTextW);
  for (let attempt = 0; attempt < 4 && lines.length > MAX_LINES; attempt++) {
    fontSize = Math.round(fontSize * 0.88);
    lineGap = Math.round(fontSize * 1.12);
    lines = wrapTitle(title, fontSize, maxTextW);
  }

  const allWords = lines.flat();
  const hlN = allWords.length > 2 ? Math.max(2, Math.min(4, Math.round(allWords.length * 0.25))) : 1;
  const highlightFrom = allWords.length - hlN;

  const baseline = height - margin - (lines.length - 1) * lineGap;
  let idx = 0;
  const textBlocks = lines
    .map((line, li) => {
      const spans = line
        .map((w, wi) => {
          const color = idx >= highlightFrom ? TEAL : "#FFFFFF";
          const isLast = wi === line.length - 1;
          idx++;
          return `<tspan fill="${color}">${escapeXml(w)}</tspan>${isLast ? "" : `<tspan xml:space="preserve" fill="#FFFFFF"> </tspan>`}`;
        })
        .join("");
      const y = baseline + li * lineGap;
      return `<text xml:space="preserve" x="${centerX}" y="${y}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${fontSize}" letter-spacing="-0.5">${spans}</text>`;
    })
    .join("");

  const catY = baseline - lineGap - 34;
  const dividerY = catY + 16;
  const scrimBottomStart = Math.max(0, 1 - ((catSize * 2 + 18 + lines.length * lineGap + margin * 1.3) / height) - 0.08);

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="topScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="${(scrimBottomStart * 100).toFixed(1)}%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.88"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${Math.round(height * 0.22)}" fill="url(#topScrim)"/>
  <rect x="0" y="${Math.round(height * 0.35)}" width="${width}" height="${Math.round(height * 0.65)}" fill="url(#bottomScrim)"/>
  <image x="${margin}" y="${logoTop}" width="${logoW}" height="${logoH}" href="${logoDataUri}" xlink:href="${logoDataUri}"/>
  <text xml:space="preserve" x="${centerX}" y="${Math.round(catY)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${catSize}" letter-spacing="3" fill="${TEAL}">${escapeXml(category.toUpperCase())}</text>
  <line x1="${margin}" y1="${Math.round(dividerY)}" x2="${width - margin}" y2="${Math.round(dividerY)}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  ${textBlocks}
</svg>`;
}

async function generateBrandedVariant(
  sourceBuffer: Buffer,
  opts: { width: number; height: number; title: string; category: string }
): Promise<{ buffer: Buffer; contentType: string }> {
  const { width, height, title, category } = opts;

  const photo = await sharp(sourceBuffer)
    .rotate()
    .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
    .toBuffer();

  const whiteLogo = await getWhiteLogoBuffer();
  const logoW = Math.round(width * 0.16);
  const logoH = Math.round(logoW * (125 / 423));
  const logoDataUri = `data:image/png;base64,${whiteLogo.toString("base64")}`;

  const overlaySvg = buildOverlaySvg(width, height, category, title, logoDataUri, logoW, logoH);

  const buffer = await sharp(photo)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return { buffer, contentType: "image/jpeg" };
}

export async function generateBrandedImages(
  sourceBuffer: Buffer,
  opts: { title: string; category: string }
): Promise<{
  hero: { buffer: Buffer; contentType: string };
  social: { buffer: Buffer; contentType: string };
}> {
  const [hero, social] = await Promise.all([
    generateBrandedVariant(sourceBuffer, { ...HERO_SIZE, ...opts }),
    generateBrandedVariant(sourceBuffer, { ...SOCIAL_SIZE, ...opts }),
  ]);
  return { hero, social };
}
