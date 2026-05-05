import { dockerCompose } from './lib.mjs';

const action = process.argv[2] ?? 'install';
const extra  = process.argv.slice(3);

const allowed = ['install', 'update', 'require', 'remove', 'dump-autoload'];
if (!allowed.includes(action)) {
  console.error(`Unsupported composer action: ${action}`);
  process.exit(1);
}

dockerCompose(['up', '-d', 'app']);
dockerCompose(['exec', '-T', 'app', 'composer', action, ...extra]);
