import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "src");
const dist = path.join(root, "dist");
const extension = path.join(root, "extension");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(source, dist, { recursive: true });

await rm(extension, { recursive: true, force: true });
await mkdir(extension, { recursive: true });
await cp(source, extension, { recursive: true });
await cp(path.join(root, "extension-src", "manifest.json"), path.join(extension, "manifest.json"));
await cp(path.join(root, "extension-src", "background.js"), path.join(extension, "background.js"));

console.log("Built web app in dist/ and browser extension in extension/");
