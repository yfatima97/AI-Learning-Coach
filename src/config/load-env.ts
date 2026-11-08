import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Project root, whether running from src/ (tsx) or dist/ (compiled).
// Resolving from here (not the current directory) lets MCP clients such as
// Claude Desktop launch the server from any folder.
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// quiet: an MCP stdio server must keep stdout clean for protocol messages.
dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });
