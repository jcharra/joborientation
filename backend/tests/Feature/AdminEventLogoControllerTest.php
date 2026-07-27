<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminEventLogoControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_config_has_no_logo_url_by_default(): void
    {
        $response = $this->getJson('/api/config');

        $response->assertOk();
        $response->assertJson(['event_logo_url' => null, 'event_favicon_url' => null]);
    }

    public function test_admin_can_upload_an_event_logo(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/event-logo', [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]);

        $response->assertOk();
        $path = AppSetting::get('event_logo_path');
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        $configResponse = $this->getJson('/api/config');
        $configResponse->assertJson(['event_logo_url' => '/storage/' . $path]);
    }

    public function test_uploading_a_logo_generates_a_64x64_favicon(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/event-logo', [
            'logo' => UploadedFile::fake()->image('logo.png', 300, 150),
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['event_logo_url', 'event_favicon_url']);

        $faviconPath = AppSetting::get('event_favicon_path');
        $this->assertNotNull($faviconPath);
        Storage::disk('public')->assertExists($faviconPath);

        $image = imagecreatefromstring(Storage::disk('public')->get($faviconPath));
        $this->assertSame(64, imagesx($image));
        $this->assertSame(64, imagesy($image));

        $configResponse = $this->getJson('/api/config');
        $configResponse->assertJsonPath('event_favicon_url', fn ($url) => str_starts_with($url, '/storage/' . $faviconPath));
    }

    public function test_logo_that_gd_cannot_decode_falls_back_to_the_original_as_favicon(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        // Valid PNG magic-byte signature followed by garbage: passes MIME/extension
        // detection as an image (so it clears the `image` validation rule) but is not
        // decodable by GD, exercising the decode-failure fallback path.
        $corruptPng = "\x89PNG\r\n\x1a\n" . str_repeat('x', 32);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/event-logo', [
            'logo' => UploadedFile::fake()->createWithContent('logo.png', $corruptPng),
        ]);

        $response->assertOk();
        $logoPath = AppSetting::get('event_logo_path');
        $faviconPath = AppSetting::get('event_favicon_path');
        $this->assertSame($logoPath, $faviconPath);
    }

    public function test_removing_the_logo_also_clears_the_favicon(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $this->actingAs($admin, 'sanctum')->post('/api/admin/event-logo', [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]);
        $this->assertNotNull(AppSetting::get('event_favicon_path'));

        $response = $this->actingAs($admin, 'sanctum')->deleteJson('/api/admin/event-logo');

        $response->assertOk();
        $response->assertJson(['event_logo_url' => null, 'event_favicon_url' => null]);
        $this->assertNull(AppSetting::get('event_favicon_path'));

        $configResponse = $this->getJson('/api/config');
        $configResponse->assertJson(['event_favicon_url' => null]);
    }

    public function test_uploading_a_non_image_file_fails_validation(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/event-logo', [
            'logo' => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf'),
        ]);

        $response->assertStatus(422);
    }

    public function test_non_admin_cannot_upload_an_event_logo(): void
    {
        Storage::fake('public');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')->post('/api/admin/event-logo', [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]);

        $response->assertForbidden();
        $this->assertNull(AppSetting::get('event_logo_path'));
    }

    public function test_admin_can_remove_the_event_logo(): void
    {
        Storage::fake('public');
        AppSetting::set('event_logo_path', 'event-logo/existing.png');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->deleteJson('/api/admin/event-logo');

        $response->assertOk();
        $this->assertNull(AppSetting::get('event_logo_path'));
    }
}
