import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const SOURCE_FILE = path.resolve(process.cwd(), "data/recipes_full_raw.csv");
const OUTPUT_FILE = path.resolve(process.cwd(), "data/recipes_clean.csv");

const SAMPLE_SIZE = 5000;
// Only ~1/3 of recipes in the wild have a photo — oversample that group so
// the card grid isn't mostly placeholder icons, while still keeping a
// realistic minority of photo-less recipes.
const PHOTO_SHARE = 0.65;

// Same "R vector" check the import script uses: `c(...)`/bare-value fields
// serialize a missing/empty list as `NA` or `character(0)`.
function isEmptyVector(raw: string | undefined): boolean {
  return !raw || raw === "NA" || raw === "character(0)";
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface CsvRow {
  Name: string;
  Images: string;
  RecipeIngredientParts: string;
  RecipeInstructions: string;
  [key: string]: string;
}

function main() {
  console.log(`Reading ${SOURCE_FILE}...`);
  const raw = readFileSync(SOURCE_FILE, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as CsvRow[];
  console.log(`Parsed ${rows.length} rows`);

  const usable = rows.filter(
    (row) =>
      row.Name?.trim() &&
      !isEmptyVector(row.RecipeIngredientParts) &&
      !isEmptyVector(row.RecipeInstructions),
  );
  console.log(`${usable.length} rows pass quality filter (name + ingredients + instructions present)`);

  const withPhoto = usable.filter((row) => !isEmptyVector(row.Images));
  const withoutPhoto = usable.filter((row) => isEmptyVector(row.Images));
  console.log(`${withPhoto.length} have a photo, ${withoutPhoto.length} don't`);

  const targetPhoto = Math.min(withPhoto.length, Math.round(SAMPLE_SIZE * PHOTO_SHARE));
  const targetNoPhoto = Math.min(withoutPhoto.length, SAMPLE_SIZE - targetPhoto);

  const sample = shuffle([
    ...shuffle(withPhoto).slice(0, targetPhoto),
    ...shuffle(withoutPhoto).slice(0, targetNoPhoto),
  ]);

  console.log(
    `Sampled ${sample.length} recipes (${targetPhoto} with photo, ${targetNoPhoto} without)`,
  );

  const output = stringify(sample, { header: true, columns: Object.keys(rows[0]) });
  writeFileSync(OUTPUT_FILE, output);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main();
