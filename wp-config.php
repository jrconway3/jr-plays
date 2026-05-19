<?php
/**
 * The base configurations of the WordPress.
 *
 * @package WordPress
 */

if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}

if ( class_exists( '\\Dotenv\\Dotenv' ) ) {
    $jr_in_docker = file_exists( '/.dockerenv' );

    // In Docker: load .env.docker first so its values win, then .env fills gaps (e.g. auth salts).
    // Outside Docker: only load .env.
    if ( $jr_in_docker && file_exists( __DIR__ . '/.env.docker' ) ) {
        Dotenv\Dotenv::createUnsafeImmutable( __DIR__, '.env.docker' )->safeLoad();
    }

    if ( file_exists( __DIR__ . '/.env' ) ) {
        Dotenv\Dotenv::createUnsafeImmutable( __DIR__, '.env' )->safeLoad();
    }

    unset( $jr_in_docker );
}

define( 'DB_NAME', getenv( 'WP_DB_NAME' ) );
define( 'DB_USER', getenv( 'WP_DB_USER' ) );

$jr_db_password = getenv( 'WP_DB_PASSWORD' );
if ( false === $jr_db_password || 'null' === strtolower( trim( (string) $jr_db_password ) ) ) {
    $jr_db_password = '';
}
define( 'DB_PASSWORD', $jr_db_password );
define( 'DB_HOST', getenv( 'WP_DB_HOST' ) );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

define( 'AUTH_KEY',         getenv( 'WP_AUTH_KEY' ) );
define( 'SECURE_AUTH_KEY',  getenv( 'WP_SECURE_AUTH_KEY' ) );
define( 'LOGGED_IN_KEY',    getenv( 'WP_LOGGED_IN_KEY' ) );
define( 'NONCE_KEY',        getenv( 'WP_NONCE_KEY' ) );
define( 'AUTH_SALT',        getenv( 'WP_AUTH_SALT' ) );
define( 'SECURE_AUTH_SALT', getenv( 'WP_SECURE_AUTH_SALT' ) );
define( 'LOGGED_IN_SALT',   getenv( 'WP_LOGGED_IN_SALT' ) );
define( 'NONCE_SALT',       getenv( 'WP_NONCE_SALT' ) );

$table_prefix = getenv( 'WP_DB_PREFIX' );
if ( ! $table_prefix ) {
    $table_prefix = 'wp_';
}
define( 'WP_DEBUG', false );

// Allow direct filesystem access only in development (local/Docker).
// Production should rely on safer defaults or explicit environment flag.
$jr_enable_direct_fs = getenv( 'WP_ENABLE_DIRECT_FS' );
if ( false !== $jr_enable_direct_fs ) {
    $jr_enable_direct_fs = strtolower( trim( (string) $jr_enable_direct_fs ) );
    if ( in_array( $jr_enable_direct_fs, array( '1', 'true', 'yes', 'on' ), true ) ) {
        define( 'FS_METHOD', 'direct' );
    }
}

$jr_site_url = getenv( 'SITE_URL' );
$jr_app_port = getenv( 'APP_PORT' );
if ( $jr_site_url ) {
    // Determine scheme: allow explicit override via SITE_SCHEME, otherwise detect.
    $jr_site_scheme = getenv( 'SITE_SCHEME' );
    if ( ! $jr_site_scheme ) {
        // Check reverse proxy headers first (common in Docker/load-balanced environments).
        // Only accept trusted schemes to prevent header injection.
        if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) ) {
            $forwarded_scheme = strtolower( trim( (string) $_SERVER['HTTP_X_FORWARDED_PROTO'] ) );
            // Handle comma-separated values (take first token) and whitelist.
            $forwarded_scheme = explode( ',', $forwarded_scheme )[0];
            $forwarded_scheme = trim( $forwarded_scheme );
            if ( in_array( $forwarded_scheme, array( 'http', 'https' ), true ) ) {
                $jr_site_scheme = $forwarded_scheme;
            }
        }
        // Fall back to HTTPS check if not proxied or proxy header invalid.
        if ( ! $jr_site_scheme ) {
            $jr_site_scheme = ( isset( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] === 'on' ) ? 'https' : 'http';
        }
    }

    // If SITE_URL includes a scheme, use it as-is; otherwise build from scheme + host.
    if ( strpos( $jr_site_url, '://' ) !== false ) {
        $jr_full_url = $jr_site_url;
    } else {
        $jr_full_url = $jr_site_scheme . '://' . $jr_site_url;
        // Append port if provided and not standard (80 for http, 443 for https).
        if ( $jr_app_port && ! in_array( $jr_app_port, array( '80', '443' ), true ) && strpos( $jr_site_url, ':' ) === false ) {
            $jr_full_url .= ':' . $jr_app_port;
        }
    }

    define( 'WP_HOME', $jr_full_url );
    define( 'WP_SITEURL', $jr_full_url );
}

define( 'AUTOSAVE_INTERVAL', 300 );
define( 'WP_POST_REVISIONS', 5 );
define( 'EMPTY_TRASH_DAYS', 7 );
define( 'WP_CRON_LOCK_TIMEOUT', 120 );
define( 'WP_AUTO_UPDATE_CORE', 'minor' );

if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
