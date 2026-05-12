<?php
/**
 * The base configurations of the WordPress.
 *
 * @package WordPress
 */

// Fallback to .env only when the runtime did not inject required values.
if ( false === getenv( 'WP_DB_NAME' ) && file_exists( __DIR__ . '/.env' ) && file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';

    if ( class_exists( '\\Dotenv\\Dotenv' ) ) {
        Dotenv\Dotenv::createImmutable( __DIR__ )->safeLoad();
    }
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
define( 'WP_DEBUG', false );

define( 'FS_METHOD', 'direct' );

$jr_site_url = getenv( 'SITE_URL' );
$jr_app_port = getenv( 'APP_PORT' );
if ( $jr_site_url ) {
    $jr_scheme   = ( isset( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] === 'on' ) ? 'https' : 'http';
    $jr_full_url = $jr_scheme . '://' . $jr_site_url;
    if ( $jr_app_port && ! in_array( $jr_app_port, array( '80', '443' ), true ) && strpos( $jr_site_url, ':' ) === false ) {
        $jr_full_url .= ':' . $jr_app_port;
    }
    define( 'WP_HOME', $jr_full_url );
    define( 'WP_SITEURL', $jr_full_url );
}

define( 'AUTOSAVE_INTERVAL', 300 );
define( 'WP_POST_REVISIONS', 5 );
define( 'EMPTY_TRASH_DAYS', 7 );
define( 'WP_CRON_LOCK_TIMEOUT', 120 );

if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
