<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_consultants_list_includes_each_speakers_topic_tag(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $tag = Tag::create(['name' => 'Medicine', 'slug' => 'medicine']);
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);
        Topic::create([
            'title' => 'Becoming a Doctor',
            'consultant_id' => $consultant->id,
            'tag_id' => $tag->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/consultants');

        $response->assertOk();
        $entry = collect($response->json())->firstWhere('id', $consultant->id);
        $this->assertSame('Medicine', $entry['topics'][0]['tag']['name']);
    }

    public function test_consultants_list_sorts_pending_speakers_first_then_by_creation_date(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $oldActivated = User::factory()->create([
            'role' => User::ROLE_CONSULTANT,
            'name' => 'Old Activated',
            'created_at' => now()->subDays(5),
        ]);
        $newPending = User::factory()->unverified()->create([
            'role' => User::ROLE_CONSULTANT,
            'name' => 'New Pending',
            'created_at' => now()->subDays(1),
        ]);
        $oldPending = User::factory()->unverified()->create([
            'role' => User::ROLE_CONSULTANT,
            'name' => 'Old Pending',
            'created_at' => now()->subDays(3),
        ]);
        $newActivated = User::factory()->create([
            'role' => User::ROLE_CONSULTANT,
            'name' => 'New Activated',
            'created_at' => now()->subDays(2),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/consultants');

        $response->assertOk();
        $names = array_column($response->json(), 'name');

        $this->assertSame([
            $oldPending->name,
            $newPending->name,
            $oldActivated->name,
            $newActivated->name,
        ], $names);
    }

    public function test_non_admin_cannot_list_consultants(): void
    {
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')->getJson('/api/admin/consultants');

        $response->assertForbidden();
    }
}
