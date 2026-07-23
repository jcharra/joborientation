<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConsultantProfileControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_graduation_year_is_validated_against_the_default_range(): void
    {
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);

        $response = $this->actingAs($consultant, 'sanctum')->postJson('/api/consultant/profile', [
            'graduation_year' => 1980,
        ]);

        $response->assertStatus(422);
    }

    public function test_graduation_year_cannot_be_the_current_year_or_later(): void
    {
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);

        $response = $this->actingAs($consultant, 'sanctum')->postJson('/api/consultant/profile', [
            'graduation_year' => now()->year,
        ]);

        $response->assertStatus(422);
    }

    public function test_graduation_year_is_validated_against_the_admin_configured_range(): void
    {
        AppSetting::set('graduation_year_min', '2000');
        AppSetting::set('graduation_year_max', '2010');
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);

        $tooEarly = $this->actingAs($consultant, 'sanctum')->postJson('/api/consultant/profile', [
            'graduation_year' => 1999,
        ]);
        $tooEarly->assertStatus(422);

        $withinRange = $this->actingAs($consultant, 'sanctum')->postJson('/api/consultant/profile', [
            'graduation_year' => 2005,
        ]);
        $withinRange->assertOk();
        $this->assertDatabaseHas('consultant_profiles', [
            'user_id' => $consultant->id,
            'graduation_year' => 2005,
        ]);
    }
}
