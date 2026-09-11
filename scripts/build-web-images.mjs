import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const jobs = [
  {
    source: path.join(root, "players"),
    output: path.join(root, "web-images", "players"),
    height: 700,
    width: null,
    quality: 82,
    alphaQuality: 92
  },
  {
    source: path.join(root, "teamlogos"),
    output: path.join(root, "web-images", "teamlogos"),
    height: 384,
    width: 384,
    quality: 84,
    alphaQuality: 94
  }
];

const supported = new Set([".png", ".jpg", ".jpeg", ".webp"]);

async function walk(dir) {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else result.push(full);
  }
  return result;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function optimize(job) {
  await ensureDir(job.output);
  const files = await walk(job.source);
  let count = 0;
  let sourceBytes = 0;
  let outputBytes = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!supported.has(ext)) continue;

    const rel = path.relative(job.source, file);
    const parsed = path.parse(rel);
    const output = path.join(job.output, parsed.dir, parsed.name + ".webp");
    await ensureDir(path.dirname(output));

    const stat = await fs.stat(file);
    sourceBytes += stat.size;

    const image = sharp(file, { animated: false }).rotate();
    const resize = job.width && job.height
      ? { width: job.width, height: job.height, fit: "inside", withoutEnlargement: true }
      : { height: job.height, fit: "inside", withoutEnlargement: true };

    await image
      .resize(resize)
      .webp({
        quality: job.quality,
        alphaQuality: job.alphaQuality,
        effort: 5,
        smartSubsample: true
      })
      .toFile(output);

    outputBytes += (await fs.stat(output)).size;
    count += 1;
  }

  return { count, sourceBytes, outputBytes, source: job.source, output: job.output };
}

const results = [];
for (const job of jobs) results.push(await optimize(job));

for (const row of results) {
  const before = (row.sourceBytes / 1024 / 1024).toFixed(1);
  const after = (row.outputBytes / 1024 / 1024).toFixed(1);
  const saved = row.sourceBytes
    ? Math.round((1 - row.outputBytes / row.sourceBytes) * 100)
    : 0;
  console.log(`${path.relative(root, row.source)}: ${row.count} bilder, ${before} MB -> ${after} MB (${saved}% mindre)`);
}
