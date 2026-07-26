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
        $response->assertJson(['event_logo_url' => null]);
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
