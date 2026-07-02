// מעתיק את ה-brand assets מ-assets/brand/ אל public/brand/ לפני ה-build/dev
import { cpSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../../assets/brand");
const dest = resolve(__dirname, "../public/brand");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Brand assets copied to public/brand/");
