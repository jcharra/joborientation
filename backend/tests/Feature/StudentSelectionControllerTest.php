<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentSelectionControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeTopics(int $count): array
    {
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);

        return collect(range(1, $count))->map(fn (int $i) => Topic::create([
            'title' => "Topic {$i}",
            'consultant_id' => $consultant->id,
            'selected_slots' => [],
        ])->id)->all();
    }

    public function test_student_can_save_a_selection_of_four_to_six_talks(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $topicIds = $this->makeTopics(5);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => $topicIds]);

        $response->assertOk();
        $response->assertJson(['topic_ids' => $topicIds]);
        foreach ($topicIds as $topicId) {
            $this->assertDatabaseHas('student_selections', ['student_id' => $student->id, 'topic_id' => $topicId]);
        }
    }

    public function test_selecting_zero_talks_fails_validation(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => []]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['topic_ids']);
    }

    public function test_a_single_talk_selection_is_allowed(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $topicIds = $this->makeTopics(1);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => $topicIds]);

        $response->assertOk();
        $response->assertJson(['topic_ids' => $topicIds]);
    }

    public function test_selecting_more_than_six_talks_fails_validation(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $topicIds = $this->makeTopics(7);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => $topicIds]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['topic_ids']);
    }

    public function test_selection_cannot_be_saved_outside_the_selection_phase(): void
    {
        AppSetting::set('current_phase', 'preparation');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $topicIds = $this->makeTopics(4);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => $topicIds]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('student_selections', ['student_id' => $student->id]);
    }

    public function test_saving_a_new_selection_replaces_the_previous_one(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $firstBatch = $this->makeTopics(4);
        $this->actingAs($student, 'sanctum')->postJson('/api/student/selection', ['topic_ids' => $firstBatch]);

        $secondBatch = $this->makeTopics(4);
        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => $secondBatch]);

        $response->assertOk();
        $this->assertSame(4, $student->talkSelections()->count());
        foreach ($firstBatch as $topicId) {
            $this->assertDatabaseMissing('student_selections', ['student_id' => $student->id, 'topic_id' => $topicId]);
        }
    }

    public function test_student_can_view_their_current_selection(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $topicIds = $this->makeTopics(4);
        $this->actingAs($student, 'sanctum')->postJson('/api/student/selection', ['topic_ids' => $topicIds]);

        $response = $this->actingAs($student, 'sanctum')->getJson('/api/student/selection');

        $response->assertOk();
        $this->assertEqualsCanonicalizing($topicIds, $response->json('topic_ids'));
    }

    public function test_selection_order_reflects_the_saved_priority(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $topicIds = $this->makeTopics(4);
        $prioritized = array_reverse($topicIds);
        $this->actingAs($student, 'sanctum')->postJson('/api/student/selection', ['topic_ids' => $prioritized]);

        $response = $this->actingAs($student, 'sanctum')->getJson('/api/student/selection');

        $response->assertOk();
        $this->assertSame($prioritized, $response->json('topic_ids'));
    }

    public function test_non_students_cannot_save_a_selection(): void
    {
        AppSetting::set('current_phase', 'selection');
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT]);
        $topicIds = $this->makeTopics(4);

        $response = $this->actingAs($consultant, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => $topicIds]);

        $response->assertForbidden();
    }

    public function test_a_nonexistent_topic_id_fails_validation(): void
    {
        AppSetting::set('current_phase', 'selection');
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $topicIds = $this->makeTopics(3);
        $topicIds[] = 999999;

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/selection', ['topic_ids' => $topicIds]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['topic_ids.3']);
    }
}
