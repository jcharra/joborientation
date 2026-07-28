<?php

namespace Tests\Feature;

use App\Models\Series;
use App\Models\Tag;
use App\Models\Topic;
use App\Models\User;
use Database\Seeders\SpeakerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpeakerSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_about_thirty_consultants(): void
    {
        $this->seed(SpeakerSeeder::class);

        $consultantCount = User::where('role', User::ROLE_CONSULTANT)->count();

        $this->assertGreaterThanOrEqual(25, $consultantCount);
        $this->assertLessThanOrEqual(35, $consultantCount);
    }

    public function test_it_leaves_some_speakers_pending_without_a_topic(): void
    {
        $this->seed(SpeakerSeeder::class);

        $pending = User::where('role', User::ROLE_CONSULTANT)->whereNull('email_verified_at')->get();

        $this->assertGreaterThan(0, $pending->count());

        foreach ($pending as $speaker) {
            $this->assertNotNull($speaker->consultantProfile, 'Pending speakers still get a sparse profile from the invite');
            $this->assertSame(0, Topic::where('consultant_id', $speaker->id)->count());
        }
    }

    public function test_it_gives_activated_speakers_a_full_profile_and_a_topic(): void
    {
        $this->seed(SpeakerSeeder::class);

        $activated = User::where('role', User::ROLE_CONSULTANT)->whereNotNull('email_verified_at')->get();

        $this->assertGreaterThan(0, $activated->count());

        foreach ($activated as $speaker) {
            $profile = $speaker->consultantProfile;
            $this->assertNotNull($profile);
            $this->assertNotNull($profile->career_path);
            $this->assertSame(1, Topic::where('consultant_id', $speaker->id)->count());
        }
    }

    public function test_it_is_idempotent_for_shared_tags_and_series(): void
    {
        $this->seed(SpeakerSeeder::class);
        $tagCountAfterFirstRun = Tag::count();
        $seriesCountAfterFirstRun = Series::count();

        $this->seed(SpeakerSeeder::class);

        $this->assertSame($tagCountAfterFirstRun, Tag::count());
        $this->assertSame($seriesCountAfterFirstRun, Series::count());
        $this->assertSame(60, User::where('role', User::ROLE_CONSULTANT)->count());
    }
}
