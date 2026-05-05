# Local Development Workflow

## Goals

- Assemble WordPress core locally without committing it to git.
- Use the repo as the source of truth for app code.
- Provide repeatable setup and test commands.
- Support linting and PHPUnit checks before deploy.

## Stack

- `Node.js` and `npm` for cross-platform task orchestration
- `docker compose` for local services
- custom PHP/Apache container for the app
- MariaDB for the database
- Mailpit for local mail testing
- WP-CLI for WordPress bootstrap
- Composer for PHP dependencies and tooling

## First-Time Setup

The local workflow uses `.env` as the WordPress runtime config source.

- `.env.docker`: Docker Compose config for local services (only used by Docker mode)

Before running any setup command, create `.env` from `.env.example` and configure the database and site values for the environment you actually want to run.

```bash
cp .env.example .env
```

You have two options for local setup:

### Option 1: Local Build (Recommended for Production Parity)

Installs WordPress, themes, plugins, and PHP dependencies directly in your current environment (XAMPP, local PHP/MySQL, etc.). This mimics production deployment more closely.

**Requirements:**
- PHP 7.4+ with CLI
- Composer installed globally or available on PATH
- Local MySQL/MariaDB database
- Apache with mod_rewrite enabled

**Run:**

```bash
npm run build
```

What this does:
- fills missing local defaults and salts in `.env`
- installs PHP dependencies via Composer
- downloads WordPress core into the repo working tree
- installs WordPress multisite if not already installed
- installs and activates a fallback modern theme (TwentyTwentyFive or TwentyTwentyFour)
- activates `jr-content-core`
- flushes rewrite rules

### Option 2: Docker-Based Setup (Recommended for Cross-Platform Development)

Starts Docker containers and runs all setup inside Docker. The Docker MariaDB service is not exposed on a host port by default; the app container talks to it over Docker's internal network to avoid conflicts with any local MySQL/MariaDB.

**Requirements:**
- Docker Desktop or Docker daemon running
- Docker Compose

**Run:**

```bash
npm run dev
```

What this does:
- Same as local build, but executed inside Docker containers
- creates `.env.docker` from `.env.docker.example` if needed
- builds and starts Docker services
- downloads WordPress core into the repo working tree
- imports your configured local SQL dump if `LOCAL_DB_DUMP` is set in `.env`
- installs WordPress multisite if not already installed
- installs and activates a fallback modern theme
- activates `jr-content-core`
- flushes rewrite rules
- provides Mailpit UI on localhost:8025 for email testing

### Switching Between Build and Dev

If you initially used `npm run dev` and later want to switch to `npm run build` (or vice versa):

1. Stop Docker if running: `npm run docker:down`
2. Ensure your local environment has the required tools installed
3. Update `.env` with appropriate database credentials for your target environment
4. Run `npm run build` or `npm run dev` as desired

## Using An Existing Local Database Copy

If you already have a local copy of the production database, that is supported.

### Keep the same WordPress salts

If your copied database should behave like the existing site data, keep the same WordPress salts and related keys.

The setup script uses the existing values in `.env` for:

- `WP_AUTH_KEY`
- `WP_SECURE_AUTH_KEY`
- `WP_LOGGED_IN_KEY`
- `WP_NONCE_KEY`
- `WP_AUTH_SALT`
- `WP_SECURE_AUTH_SALT`
- `WP_LOGGED_IN_SALT`
- `WP_NONCE_SALT`
- `WP_DB_NAME`
- `WP_DB_USER`
- `WP_DB_PASSWORD`
- `WP_DB_PREFIX`

### Choose your local database mode

#### Option 1: Use the Docker MariaDB service

Recommended if you want the repo to control the full local stack.

You do not need to set Docker DB credentials manually in `.env`. The Docker app container injects the Docker-local `WP_DB_NAME`, `WP_DB_USER`, `WP_DB_PASSWORD`, `WP_DB_HOST`, and `WP_DB_PORT` values at runtime.

In `.env`, you can leave `WP_DB_HOST` as your normal non-Docker value.

Set this once in `.env`:

- `LOCAL_DB_DUMP=C:/path/to/local-copy.sql`

Then just run:

```bash
npm run dev
```

The setup command will import your local SQL dump into the Docker database container automatically.

If the imported database points at the legacy `jaidynreiman` theme and local Bebop or Gantry dependencies are unavailable, the bootstrap will switch the local site to a default WordPress theme so the site can still boot.

Examples:

```bash
npm run db:import -- C:/path/to/local-copy.sql
```

```bash
npm run db:import -- C:/path/to/local-copy.sql.gz
```

If the dump already contains a working WordPress install, `npm run dev` will skip `wp core multisite-install` because it checks `wp core is-installed` first.

#### Option 2: Use an existing database server on your machine

Recommended if you already maintain your own local MySQL or MariaDB instance.

In `.env`:

- set `WP_DB_HOST=host.docker.internal`

Do not use `localhost` for `WP_DB_HOST` when WordPress runs inside Docker. Inside the container, `localhost` points to the container itself, not your Windows host.

If you switch back to the Docker MariaDB service, you do not need to edit `.env` again. Docker Compose overrides `WP_DB_HOST` to `db` for the app container automatically.

## Test Commands

Run all checks:

```bash
npm test
```

Run lint only:

```bash
npm run lint
```

Run PHPUnit only:

```bash
npm run test:unit
```

## npm Scripts

The cross-platform entry points live in `package.json`:

### Initial Setup (choose one)
- `npm run build` — Local non-Docker setup (production-like)
- `npm run dev` — Docker-based setup (cross-platform)

### Aliases (for compatibility)
- `npm run build:local` — Alias for `npm run build`
- `npm run setup:local` — Alias for `npm run build` (deprecated; use `npm run build` directly)

### Docker Management
- `npm run docker:up` — Start Docker services (for `npm run dev`)
- `npm run docker:down` — Stop Docker services
- `npm run docker:wp` — Run WP-CLI commands inside Docker

### Testing and Linting
- `npm test` — Run all checks (linting + unit tests, requires Docker)
- `npm run lint` — Run PHP CodeSniffer linting only (requires Docker)
- `npm run test:unit` — Run PHPUnit tests only (requires Docker)

### Database Operations
- `npm run db:import -- path/to/dump.sql` — Import a database dump into Docker (requires Docker)
- `npm run composer` — Run Composer commands in Docker
- `npm run composer:install` — Install PHP dependencies in Docker
- `npm run composer:update` — Update PHP dependencies in Docker

### URL Testing
- `npm run test:urls` — Test site URLs and response codes (requires local site running)

## Roadmap Automation Script

The roadmap automation script is isolated under `scripts/roadmap` so it can be moved into its own repository and later mounted here as a git submodule.

The `*.example.json` files intentionally contain DUMMY sample data only.

Local setup:

1. Copy `scripts/roadmap/.env.example` to `scripts/roadmap/.env`.
2. Create `scripts/roadmap/data/sprints.json` from `scripts/roadmap/data/sprints.example.json`.
3. Create `scripts/roadmap/data/tasks.json` from `scripts/roadmap/data/tasks.example.json`.
4. Fill `scripts/roadmap/.env` with your GitHub token and target repo/project values.

Run:

```bash
cd scripts/roadmap
npm run create
```

What the script does:

- creates missing sprint milestones
- creates missing task issues
- adds those issues to the configured personal GitHub Project
- skips milestones/issues that already exist

Files intentionally not committed:

- `scripts/roadmap/.env`
- `scripts/roadmap/data/sprints.json`
- `scripts/roadmap/data/tasks.json`

Submodule migration steps (when your separate repo is ready):

1. Push the current `scripts/roadmap` contents to the new repository.
2. In this repository, remove the tracked folder copy.
3. Add the external repository back at the same path:

```bash
git submodule add <roadmap-repo-url> scripts/roadmap
git submodule update --init --recursive
```

## PowerShell Compatibility Wrappers

If you still want Windows-native entry points, the PowerShell scripts remain in place as thin wrappers:

- `scripts/setup-local.ps1`
- `scripts/test.ps1`

They now call the Node scripts instead of duplicating logic.

## Common Setup Failure Causes

### For `npm run build` (local environment):

1. PHP is not available on PATH.
   - Install PHP 7.4+ and add to system PATH.
   - Verify: `php --version`

2. Composer is not available on PATH or not installed.
   - Install Composer globally: https://getcomposer.org/download/
   - Or set COMPOSER environment variable to point to composer.phar
   - The script will attempt to bootstrap Composer if not found, but this may fail without PHP on PATH.

3. MySQL/MariaDB is not running.
   - For XAMPP: start MySQL service from Control Panel.
   - Ensure `WP_DB_HOST=localhost` in `.env` and database credentials match your local setup.

4. Port conflict (Apache already running on port 80).
   - Either stop the conflicting service or set `APP_PORT` to a different port in `.env`.

### For `npm run dev` (Docker environment):

1. Docker Desktop is not running.
   - The scripts require a working Docker daemon.
   - Start Docker Desktop or docker daemon and try again.

2. Your `.env` contains values for a different environment than the one you want to test.
   - For host-local MySQL, use `WP_DB_HOST=host.docker.internal`.
   - For Docker MariaDB plus dump import, use `WP_DB_HOST=db` and set `LOCAL_DB_DUMP`.

3. Port conflicts or resource limits.
   - Docker services may fail to start if ports are already in use or memory is constrained.
   - Check Docker logs: `docker compose logs app`

## Likely Next Step After Import

If the imported database still points at a production domain, you will usually need a URL update before the local site behaves correctly.

Because this site is multisite, do not do a blind global search-replace first. Confirm the import and bootstrap work, then handle URL rewriting carefully.

## Scope Of Initial Linting

The initial PHPCS config targets:

- `wp-content/plugins/jr-content-core`
- `tests`
- `wp-config.php`

It intentionally does not lint the legacy theme yet because that would bury the new workflow under unrelated existing violations.

## Scope Of Initial PHPUnit Coverage

The initial PHPUnit setup is a smoke-level integration check that verifies:

- core post types register
- core taxonomies register
- shared meta keys register

This is intentionally small. It gives you a working test harness before broader refactors begin.