import { dockerCompose } from './lib.mjs';

const suite = process.argv[2] ?? 'all';

if (!['all', 'lint', 'unit'].includes(suite)) {
  console.error(`Unsupported suite: ${suite}`);
  process.exit(1);
}

dockerCompose(['up', '-d', 'db', 'app']);
dockerCompose(['exec', '-T', 'app', 'bash', '-lc', 'composer install']);

if (suite === 'lint' || suite === 'all') {
  dockerCompose(['exec', '-T', 'app', 'bash', '-lc', 'vendor/bin/phpcs --standard=phpcs.xml.dist']);
}

if (suite === 'unit' || suite === 'all') {
  dockerCompose(['exec', '-T', 'app', 'bash', '-lc', 'vendor/bin/phpunit --configuration phpunit.xml.dist']);
}
