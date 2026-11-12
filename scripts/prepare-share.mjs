// Builds the image that link previews show (LinkedIn, WhatsApp, Slack): the
// logo, white on black, at the 1200x630 size those services expect.
// Usage: node scripts/prepare-share.mjs [logo] [output]
import sharp from "sharp";

const [logo = "src/assets/logo.svg", output = "public/share.png"] = process.argv.slice(2);

const SIZE = { width: 1200, height: 630 };
/** The logo's height on the card; the rest is breathing room. */
const LOGO_HEIGHT = 420;

const mark = await sharp(logo, { density: 300 }).resize({ height: LOGO_HEIGHT }).toBuffer();

const info = await sharp({ create: { ...SIZE, channels: 3, background: "#000" } })
  .composite([{ input: mark, gravity: "centre" }])
  .png({ compressionLevel: 9, palette: true })
  .toFile(output);

console.log(`${output}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
