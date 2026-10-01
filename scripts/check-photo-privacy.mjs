// Fails the build if any photo under content/ still carries GPS location data.
// The site itself never publishes EXIF, but the repository is public, so the original files must be clean too.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = "content";
const IMAGE = /\.(jpe?g|png|webp|avif|tiff?|heic)$/i;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (IMAGE.test(e.name)) yield p;
  }
}

// minimal TIFF/EXIF reader: does IFD0 point at a GPS IFD (tag 0x8825)?
function hasGps(exif) {
  let o = exif.indexOf("Exif\0\0") === 0 ? 6 : 0;
  const le = exif.toString("ascii", o, o + 2) === "II";
  const u16 = (i) => (le ? exif.readUInt16LE(i) : exif.readUInt16BE(i));
  const u32 = (i) => (le ? exif.readUInt32LE(i) : exif.readUInt32BE(i));
  const ifd0 = o + u32(o + 4);
  const n = u16(ifd0);
  for (let k = 0; k < n; k++) if (u16(ifd0 + 2 + k * 12) === 0x8825) return true;
  return false;
}

const leaks = [];
for await (const file of walk(ROOT)) {
  const { exif } = await sharp(file).metadata();
  if (exif && hasGps(exif)) leaks.push(file);
}

if (leaks.length) {
  console.error("\n✗ These photos still contain GPS location data:\n" + leaks.map((f) => "  - " + f).join("\n"));
  console.error("\nRe-export them without location (see README → Adding photos) and commit again.\n");
  process.exit(1);
}
console.log("✓ No GPS data found in content/ photos.");
