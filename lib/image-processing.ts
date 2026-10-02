import "server-only";
import sharp from "sharp";
import path from "path";
import { readFile } from "fs/promises";
import satori from "satori";

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
//
// Text is rendered via satori (the library behind Vercel's own next/og),
// not raw SVG <text> + system fontconfig. Fontconfig-based SVG text
// rendering on Vercel serverless functions has a long, documented history
// of being unreliable (see github.com/lovell/sharp/issues/2499) since it
// depends on OS-level font installation that doesn't carry over cleanly
// to a Lambda-style runtime. Satori sidesteps this entirely: you hand it
// the font file's raw bytes directly, it performs text shaping itself in
// pure JS, and its SVG output already contains real <path> vector outlines
// — no font lookup happens at final-rasterization time, so sharp can
// composite it with zero font dependency at all.
// ---------------------------------------------------------------------------

const HERO_SIZE = { width: 1600, height: 900 };
const SOCIAL_SIZE = { width: 1080, height: 1350 };
const TEAL = "#B8FFEB";
const FONT_NAME = "Jakarta";
const FONT_WEIGHT = 800;
const MAX_LINES = 3;

type Node = { type: string; props: Record<string, any> };

function h(type: string, props: Record<string, any> = {}, ...children: any[]): Node {
  const flat = children.flat().filter((c) => c !== null && c !== false && c !== undefined);
  return {
    type,
    props: {
      ...props,
      children: flat.length === 0 ? undefined : flat.length === 1 ? flat[0] : flat,
    },
  };
}

let fontBufferPromise: Promise<Buffer> | null = null;
async function getFontBuffer(): Promise<Buffer> {
  if (!fontBufferPromise) {
    fontBufferPromise = readFile(
      path.join(process.cwd(), "public", "fonts", "PlusJakartaSans-ExtraBold.ttf")
    );
  }
  return fontBufferPromise;
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

// Character-count based estimate for a starting font size that will likely
// fit within MAX_LINES — not a precise measurement (satori doesn't expose
// line-wrap counts directly), but paired with a bottom-anchored layout
// that grows upward gracefully if this slightly under-shrinks.
function pickFontSize(title: string, width: number): number {
  const margin = width * 0.055;
  const availableWidth = width - margin * 2;
  const baseFontSize = width * 0.052;
  const avgCharWidthFactor = 0.62;
  const charsPerLineAtBase = availableWidth / (baseFontSize * avgCharWidthFactor);
  const capacityAtBase = charsPerLineAtBase * MAX_LINES * 0.92;
  if (title.length <= capacityAtBase) return Math.round(baseFontSize);
  const scale = Math.max(0.6, capacityAtBase / title.length);
  return Math.round(baseFontSize * scale);
}

function buildOverlayTree(
  width: number,
  height: number,
  category: string,
  title: string,
  logoDataUri: string,
  logoW: number,
  logoH: number
): Node {
  const margin = Math.round(width * 0.055);
  const logoTop = Math.round(height * 0.045);
  const catSize = Math.round(width * 0.02);
  const fontSize = pickFontSize(title, width);

  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  const hlN = words.length > 2 ? Math.max(2, Math.min(4, Math.round(words.length * 0.25))) : 1;
  const highlightFrom = words.length - hlN;

  const textStyleBase = {
    fontFamily: FONT_NAME,
    fontWeight: FONT_WEIGHT,
  };

  const titleRow = h(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%",
      },
    },
    ...words.map((w, i) =>
      h(
        "div",
        {
          style: {
            ...textStyleBase,
            color: i >= highlightFrom ? TEAL : "#FFFFFF",
            fontSize,
            letterSpacing: -0.5,
            marginRight: Math.round(fontSize * 0.22),
            lineHeight: 1.15,
          },
        },
        w
      )
    )
  );

  const bottomBlock = h(
    "div",
    {
      style: {
        position: "absolute",
        left: margin,
        right: margin,
        bottom: margin,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      },
    },
    h(
      "div",
      {
        style: {
          ...textStyleBase,
          color: TEAL,
          fontSize: catSize,
          letterSpacing: 3,
          marginBottom: 14,
        },
      },
      category.toUpperCase()
    ),
    h("div", {
      style: {
        width: "100%",
        height: 2,
        background: "rgba(255,255,255,0.35)",
        marginBottom: 18,
      },
    }),
    titleRow
  );

  return h(
    "div",
    {
      style: {
        width,
        height,
        display: "flex",
        position: "relative",
      },
    },
    h("div", {
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height: Math.round(height * 0.22),
        backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: 0,
        bottom: 0,
        width,
        height: Math.round(height * 0.55),
        backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.9))",
      },
    }),
    h("img", {
      src: logoDataUri,
      width: logoW,
      height: logoH,
      style: { position: "absolute", left: margin, top: logoTop },
    }),
    bottomBlock
  );
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

  const fontData = await getFontBuffer();
  const tree = buildOverlayTree(width, height, category, title, logoDataUri, logoW, logoH);

  const overlaySvg = await satori(tree as any, {
    width,
    height,
    fonts: [{ name: FONT_NAME, data: fontData, weight: FONT_WEIGHT, style: "normal" }],
  });

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
