<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPhaseDatesControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_config_returns_null_phase_dates_by_default(): void
    {
        $response = $this->getJson('/api/config');

        $response->assertOk();
        $response->assertJson([
            'selection_phase_start' => null,
            'conference_phase_start' => null,
        ]);
    }

    public function test_admin_can_set_the_phase_start_dates(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/phase-dates', [
            'selection_phase_start' => '2026-09-04 09:00:00',
            'conference_phase_start' => '2026-10-28 09:00:00',
        ]);

        $response->assertOk();
        $this->assertSame('2026-09-04 09:00:00', AppSetting::get('selection_phase_start'));
        $this->assertSame('2026-10-28 09:00:00', AppSetting::get('conference_phase_start'));

        $configResponse = $this->getJson('/api/config');
        $configResponse->assertJson([
            'selection_phase_start' => '2026-09-04 09:00:00',
            'conference_phase_start' => '2026-10-28 09:00:00',
        ]);
    }

    public function test_phase_start_dates_can_be_cleared(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        AppSetting::set('selection_phase_start', '2026-09-04 09:00:00');
        AppSetting::set('conference_phase_start', '2026-10-28 09:00:00');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/phase-dates', [
            'selection_phase_start' => null,
            'conference_phase_start' => null,
        ]);

        $response->assertOk();
        $this->assertNull(AppSetting::get('selection_phase_start'));
        $this->assertNull(AppSetting::get('conference_phase_start'));
    }

    public function test_updating_phase_dates_rejects_an_invalid_datetime(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/phase-dates', [
            'selection_phase_start' => 'not-a-date',
        ]);

        $response->assertStatus(422);
    }

    public function test_non_admin_cannot_update_phase_dates(): void
    {
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')->postJson('/api/admin/phase-dates', [
            'selection_phase_start' => '2026-09-04 09:00:00',
            'conference_phase_start' => '2026-10-28 09:00:00',
        ]);

        $response->assertForbidden();
        $this->assertNull(AppSetting::get('selection_phase_start'));
    }
}
