<?php

namespace Tests\Feature;

use App\Models\Series;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSeriesControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_series_list_is_publicly_readable(): void
    {
        // The 'autre' row is seeded by the create_series_table migration itself.
        $response = $this->getJson('/api/series');

        $response->assertOk();
        $response->assertJsonFragment(['name' => 'autre']);
    }

    public function test_admin_can_create_a_series(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/series', ['name' => 'ES']);

        $response->assertCreated();
        $response->assertJsonFragment(['name' => 'ES']);
        $this->assertDatabaseHas('series', ['name' => 'ES']);
    }

    public function test_creating_a_duplicate_series_name_fails_validation(): void
    {
        Series::create(['name' => 'ES']);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/series', ['name' => 'ES']);

        $response->assertStatus(422);
    }

    public function test_admin_can_delete_a_series(): void
    {
        $series = Series::create(['name' => 'ES']);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/series/{$series->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('series', ['id' => $series->id]);
    }

    public function test_non_admin_cannot_create_a_series(): void
    {
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/admin/series', ['name' => 'ES']);

        $response->assertForbidden();
        $this->assertDatabaseMissing('series', ['name' => 'ES']);
    }

    public function test_non_admin_cannot_delete_a_series(): void
    {
        $series = Series::create(['name' => 'ES']);
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')
            ->deleteJson("/api/admin/series/{$series->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('series', ['id' => $series->id]);
    }
}
