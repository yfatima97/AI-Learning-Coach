import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { extractText } from "unpdf";

export interface LoadedPage {
  source: string;
  page?: number;
  text: string;
}

const SUPPORTED = new Set([".pdf", ".md", ".txt"]);

/** Read every PDF, Markdown and text file in a folder (recursively). */
export async function loadDocuments(dir: string): Promise<LoadedPage[]> {
  const pages: LoadedPage[] = [];
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED.has(ext) || entry.name.toLowerCase() === "readme.md") continue;

    const fullPath = path.join(entry.parentPath, entry.name);
    const source = path.relative(dir, fullPath).replaceAll("\\", "/");

    if (ext === ".pdf") {
      const data = new Uint8Array(await readFile(fullPath));
      const { text } = await extractText(data, { mergePages: false });
      text.forEach((pageText, i) => {
        if (pageText.trim()) pages.push({ source, page: i + 1, text: pageText });
      });
    } else {
      pages.push({ source, text: await readFile(fullPath, "utf8") });
    }
  }
  return pages;
}
