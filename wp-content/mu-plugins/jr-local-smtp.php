<?php
/**
 * Redirect outgoing email to the local Mailpit SMTP server when configured.
 *
 * Loaded automatically by WordPress as a must-use plugin so the hook runs
 * after WordPress core is fully bootstrapped (unlike wp-config.php).
 *
 * @package JRPlays
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'phpmailer_init',
	function ( $phpmailer ) {
		$smtp_host = getenv( 'WP_SMTP_HOST' );
		$smtp_port = getenv( 'WP_SMTP_PORT' );
		if ( $smtp_host ) {
			$phpmailer->isSMTP();
			$phpmailer->Host     = $smtp_host; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
			$phpmailer->Port     = $smtp_port ? (int) $smtp_port : 1025; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
			$phpmailer->SMTPAuth = false; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
		}
	}
);
