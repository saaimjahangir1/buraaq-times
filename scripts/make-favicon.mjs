import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "public", "logo.jpg");
const OUT = path.join(__dirname, "..", "public", "favicon.png");
const SIZE = 512;
const BG = { r: 250, g: 249, b: 245, alpha: 1 };

async function run() {
  const resized = await sharp(SRC)
    .resize(SIZE, SIZE, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  await sharp(resized).toFile(OUT);
  console.log(`Wrote ${OUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
