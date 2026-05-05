import fs from 'node:fs';

import {
  assertDockerAvailable,
  importDumpIntoDockerDb,
  repoRoot,
  resolveRepoPath,
} from './lib.mjs';

const dumpArg = process.argv[2];

if (!dumpArg) {
  console.error('Usage: npm run db:import -- <path-to-dump.sql|path-to-dump.sql.gz>');
  process.exit(1);
}

assertDockerAvailable();

const dumpPath = resolveRepoPath(dumpArg);

if (!fs.existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

const dbName = importDumpIntoDockerDb(dumpPath);

console.log(`Imported database dump into ${dbName} from ${dumpPath}`);