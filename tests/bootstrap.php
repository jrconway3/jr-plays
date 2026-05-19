<?php

$repo_root = dirname( __DIR__ );
$wp_load   = $repo_root . '/wp-load.php';

if ( ! file_exists( $wp_load ) ) {
	fwrite( STDERR, "wp-load.php was not found. Run 'npm run build' or 'npm run dev' first.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite
	exit( 1 );
}

require_once $wp_load;

$plugin_file = $repo_root . '/wp-content/plugins/jr-content-core/jr-content-core.php';

if ( file_exists( $plugin_file ) ) {
	require_once $plugin_file;
}

if ( function_exists( 'jr_content_core_register_post_types' ) ) {
	jr_content_core_register_post_types();
}

if ( function_exists( 'jr_content_core_register_taxonomies' ) ) {
	jr_content_core_register_taxonomies();
}

if ( function_exists( 'jr_content_core_register_meta' ) ) {
	jr_content_core_register_meta();
}
