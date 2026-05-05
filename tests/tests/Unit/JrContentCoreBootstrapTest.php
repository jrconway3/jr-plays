<?php

use PHPUnit\Framework\TestCase;

final class JrContentCoreBootstrapTest extends TestCase
{
    public function test_core_post_types_are_registered(): void
    {
        $this->assertTrue(post_type_exists('game'));
        $this->assertTrue(post_type_exists('character'));
        $this->assertTrue(post_type_exists('review'));
        $this->assertTrue(post_type_exists('portfolio'));
    }

    public function test_core_taxonomies_are_registered(): void
    {
        $this->assertTrue(taxonomy_exists('platform'));
        $this->assertTrue(taxonomy_exists('genre'));
        $this->assertTrue(taxonomy_exists('progression'));
    }

    public function test_shared_meta_is_registered(): void
    {
        $postMeta = get_registered_meta_keys('post', 'post');
        $reviewMeta = get_registered_meta_keys('post', 'review');

        $this->assertArrayHasKey('jrblog_page_video_src', $postMeta);
        $this->assertArrayHasKey('associated_games', $postMeta);
        $this->assertArrayHasKey('ratings', $reviewMeta);
    }
}
