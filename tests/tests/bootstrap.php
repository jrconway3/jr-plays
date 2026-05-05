<?php

$repoRoot = dirname(__DIR__);
$wpLoad = $repoRoot . '/wp-load.php';

if (!file_exists($wpLoad)) {
    fwrite(STDERR, "wp-load.php was not found. Run 'npm run build' or 'npm run dev' first.\n");
    exit(1);
}

require_once $wpLoad;

$pluginFile = $repoRoot . '/wp-content/plugins/jr-content-core/jr-content-core.php';

if (file_exists($pluginFile)) {
    require_once $pluginFile;
}

if (function_exists('jr_content_core_register_post_types')) {
    jr_content_core_register_post_types();
}

if (function_exists('jr_content_core_register_taxonomies')) {
    jr_content_core_register_taxonomies();
}

if (function_exists('jr_content_core_register_meta')) {
    jr_content_core_register_meta();
}
