import { mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

export function getProjectRoot(): string {
  return projectRoot;
}

export function getDataDir(): string {
  const dataDir =
    process.env.COURSICOTA_DATA_DIR ?? path.join(projectRoot, "data");
  mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export function getListsDir(): string {
  const listsDir =
    process.env.COURSICOTA_LISTS_DIR ?? path.join(getDataDir(), "lists");
  mkdirSync(listsDir, { recursive: true });
  return listsDir;
}

export function getDatabasePath(): string {
  return (
    process.env.COURSICOTA_DB_PATH ??
    path.join(getDataDir(), "coursicota.db")
  );
}

export function getCarrefourMcpDir(): string {
  return (
    process.env.CARREFOUR_MCP_DIR ??
    path.resolve(projectRoot, "../carrefour-mcp")
  );
}
