import { dockerCompose } from './lib.mjs';

const wpArgs = process.argv.slice(2);

if (wpArgs.length === 0) {
  console.error('Usage: npm run docker:wp -- <wp-cli arguments>');
  console.error('Example: npm run docker:wp -- plugin list --allow-root');
  process.exit(1);
}

dockerCompose(['up', '-d', 'db', 'app']);
dockerCompose([
  'exec',
  '-T',
  'app',
  'bash',
  '-lc',
  'if [ ! -f wp-load.php ]; then wp core download --allow-root --skip-content; fi',
]);
dockerCompose(['exec', '-T', 'app', 'wp', ...wpArgs]);