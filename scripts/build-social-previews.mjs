import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const previews = [
  ["social/android-social-preview.svg", "social/android-social-preview.png"],
  ["social/iphone-social-preview.svg", "social/iphone-social-preview.png"],
  ["social/sec-social-preview.svg", "social/sec-social-preview.png"],
];

for (const [source, target] of previews) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await sharp(source, { density: 144 })
    .resize(1200, 630, { fit: "fill" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(target);

  const stat = await fs.stat(target);
  console.log(`${target}: ${stat.size} bytes`);
}
