import { dockerCompose } from './lib.mjs';

const action = process.argv[2] ?? 'up';

if (action === 'up') {
  dockerCompose(['up', '-d']);
} else if (action === 'down') {
  dockerCompose(['down']);
} else {
  console.error(`Unsupported docker action: ${action}`);
  process.exit(1);
}
