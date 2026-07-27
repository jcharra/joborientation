<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminEventDetailsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_config_returns_null_event_datetime_and_location_by_default(): void
    {
        $response = $this->getJson('/api/config');

        $response->assertOk();
        $response->assertJson([
            'event_datetime' => null,
            'event_location' => null,
            'event_manager_email' => 'admin@example.com',
        ]);
    }

    public function test_admin_can_set_the_event_datetime_location_and_manager_email(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/event-details', [
            'event_datetime' => '2026-10-15 09:00:00',
            'event_location' => 'Aula, Musterschule',
            'event_manager_email' => 'organizer@example.com',
        ]);

        $response->assertOk();
        $this->assertSame('2026-10-15 09:00:00', AppSetting::get('event_datetime'));
        $this->assertSame('Aula, Musterschule', AppSetting::get('event_location'));
        $this->assertSame('organizer@example.com', AppSetting::get('event_manager_email'));

        $configResponse = $this->getJson('/api/config');
        $configResponse->assertJson([
            'event_datetime' => '2026-10-15 09:00:00',
            'event_location' => 'Aula, Musterschule',
            'event_manager_email' => 'organizer@example.com',
        ]);
    }

    public function test_event_location_and_manager_email_can_be_cleared(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        AppSetting::set('event_location', 'Old location');
        AppSetting::set('event_manager_email', 'old@example.com');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/event-details', [
            'event_datetime' => null,
            'event_location' => null,
            'event_manager_email' => null,
        ]);

        $response->assertOk();
        $this->assertNull(AppSetting::get('event_location'));
        $this->assertNull(AppSetting::get('event_manager_email'));
    }

    public function test_updating_event_details_rejects_an_invalid_datetime(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/event-details', [
            'event_datetime' => 'not-a-date',
        ]);

        $response->assertStatus(422);
    }

    public function test_updating_event_details_rejects_an_invalid_manager_email(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/event-details', [
            'event_manager_email' => 'not-an-email',
        ]);

        $response->assertStatus(422);
    }

    public function test_non_admin_cannot_update_event_details(): void
    {
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')->postJson('/api/admin/event-details', [
            'event_datetime' => '2026-10-15 09:00:00',
            'event_location' => 'Aula, Musterschule',
        ]);

        $response->assertForbidden();
        $this->assertNull(AppSetting::get('event_datetime'));
    }
}
