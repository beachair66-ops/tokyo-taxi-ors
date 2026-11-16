import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
const assets = {};
for (const file of ['index.html', 'app.js', 'i18n.js', 'manifest.webmanifest']) assets[file] = await readFile(file, 'utf8');
const worker = await readFile('worker/index.js', 'utf8');
await writeFile('dist/server/index.js', `const ASSETS=${JSON.stringify(assets)};\n${worker}`);
let manifest;
try { manifest = await readFile('.openai/hosting.json', 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; manifest = JSON.stringify({ capabilities: ['mcp'] }); }
await writeFile('dist/.openai/hosting.json', manifest);
console.log('Worker build complete');
