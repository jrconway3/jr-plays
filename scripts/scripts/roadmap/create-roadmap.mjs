import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { syncRoadmap } from './lib/sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
syncRoadmap(scriptDir).catch((error) => {
  console.error('Roadmap sync failed.');
  console.error(error.message);
  process.exit(1);
});
