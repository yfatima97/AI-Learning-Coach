import { ReviewAgent } from "../agents/review.agent.js";

const CODE_EXT = /\.(py|ts|tsx|js|jsx|java|cs|go|rb|php|ipynb|sql|html|css)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|venv|\.venv|__pycache__|\.git)\//;
const MAX_FILES = 8;
const MAX_CHARS = 60_000;

function parseRepo(url: string) {
  const m = url.trim().match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i) ?? url.trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!m) throw new Error(`Not a GitHub repo URL: ${url}`);
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function gh<T>(apiPath: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "ai-learning-coach" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${apiPath}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${apiPath}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

/**
 * GitHub tool: pull a public repo's README and main source files,
 * then have the Review agent score it like a senior engineer would.
 */
export async function reviewGithubRepo(url: string, context = "") {
  const { owner, repo } = parseRepo(url);
  const info = await gh<{ default_branch: string; description: string | null }>(`/repos/${owner}/${repo}`);
  const tree = await gh<{ tree: { path: string; type: string; size?: number }[] }>(
    `/repos/${owner}/${repo}/git/trees/${info.default_branch}?recursive=1`,
  );

  const files = tree.tree.filter((f) => f.type === "blob");
  const readme = files.find((f) => /^readme\.md$/i.test(f.path));
  const code = files
    .filter((f) => CODE_EXT.test(f.path) && !SKIP.test(f.path) && (f.size ?? 0) < 40_000)
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length || (b.size ?? 0) - (a.size ?? 0))
    .slice(0, MAX_FILES);

  let bundle = `Repository: ${owner}/${repo}\nDescription: ${info.description ?? "(none)"}\n\nFile tree:\n${files
    .map((f) => f.path)
    .filter((p) => !SKIP.test(p))
    .slice(0, 200)
    .join("\n")}\n`;
  for (const f of [readme, ...code].filter(Boolean) as { path: string }[]) {
    const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${info.default_branch}/${f.path}`);
    if (!raw.ok) continue;
    bundle += `\n--- ${f.path} ---\n${await raw.text()}\n`;
    if (bundle.length > MAX_CHARS) break;
  }

  const review = await ReviewAgent.review(bundle.slice(0, MAX_CHARS), context || "A learner's GitHub portfolio project");
  return { repo: `${owner}/${repo}`, filesReviewed: [readme, ...code].filter(Boolean).map((f) => f!.path), ...review };
}
