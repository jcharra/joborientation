<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminGraduationYearRangeControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_config_returns_the_seeded_graduation_year_range_defaults(): void
    {
        $response = $this->getJson('/api/config');

        $response->assertOk();
        $response->assertJson([
            'graduation_year_range' => ['min' => 1990, 'max' => 2050],
        ]);
    }

    public function test_admin_can_update_the_graduation_year_range(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/graduation-year-range', [
            'min' => 2000,
            'max' => 2030,
        ]);

        $response->assertOk();
        $this->assertSame('2000', AppSetting::get('graduation_year_min'));
        $this->assertSame('2030', AppSetting::get('graduation_year_max'));

        $configResponse = $this->getJson('/api/config');
        $configResponse->assertJson([
            'graduation_year_range' => ['min' => 2000, 'max' => 2030],
        ]);
    }

    public function test_updating_the_graduation_year_range_rejects_min_greater_than_max(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/graduation-year-range', [
            'min' => 2030,
            'max' => 2000,
        ]);

        $response->assertStatus(422);
    }

    public function test_non_admin_cannot_update_the_graduation_year_range(): void
    {
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')->postJson('/api/admin/graduation-year-range', [
            'min' => 2000,
            'max' => 2030,
        ]);

        $response->assertForbidden();
        $this->assertSame('1990', AppSetting::get('graduation_year_min'));
    }
}
