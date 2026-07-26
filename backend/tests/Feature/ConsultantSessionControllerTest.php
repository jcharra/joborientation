<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConsultantSessionControllerTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Corporate Law',
            'description' => 'A short description of the session.',
            'selected_slots' => ['in_person_1330'],
        ], $overrides);
    }

    public function test_consultant_can_save_a_description_up_to_200_characters(): void
    {
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);

        $response = $this->actingAs($consultant, 'sanctum')
            ->postJson('/api/consultant/session', $this->payload(['description' => str_repeat('a', 200)]));

        $response->assertOk();
        $this->assertDatabaseHas('topics', [
            'consultant_id' => $consultant->id,
            'description' => str_repeat('a', 200),
        ]);
    }

    public function test_description_longer_than_200_characters_fails_validation(): void
    {
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);

        $response = $this->actingAs($consultant, 'sanctum')
            ->postJson('/api/consultant/session', $this->payload(['description' => str_repeat('a', 201)]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['description']);
    }
}
