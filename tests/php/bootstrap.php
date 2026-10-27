<?php
/**
 * PHPUnit bootstrap: the Config logic under test needs no WordPress.
 */

define( 'ABSPATH', __DIR__ . '/' );

require_once dirname( __DIR__, 2 ) . '/vendor/autoload.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-config.php';
