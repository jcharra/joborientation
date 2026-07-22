<?php

namespace Tests\Feature;

use App\Mail\SpeakerInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminInviteControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_invite_a_single_speaker(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/invite', [
            'salutation'      => 'Frau',
            'first_name'      => 'Jane',
            'last_name'       => 'Doe',
            'email'           => 'jane.doe@example.com',
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', [
            'email' => 'jane.doe@example.com',
            'role'  => User::ROLE_CONSULTANT,
        ]);
        $this->assertDatabaseHas('consultant_profiles', [
            'salutation' => 'Frau',
            'first_name' => 'Jane',
            'last_name'  => 'Doe',
        ]);
        Mail::assertSent(SpeakerInvitation::class, 1);
    }

    public function test_single_invite_replaces_the_name_placeholder(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/invite', [
            'salutation'      => 'Frau',
            'first_name'      => 'Jane',
            'last_name'       => 'Doe',
            'email'           => 'jane.doe@example.com',
            'invitation_body' => 'Dear $NAME, please join us.',
        ]);

        $response->assertOk();
        Mail::assertSent(SpeakerInvitation::class, function (SpeakerInvitation $mail) {
            return $mail->body === 'Dear Frau Doe, please join us.';
        });
    }

    public function test_single_invite_requires_a_salutation(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/invite', [
            'first_name'      => 'Jane',
            'last_name'       => 'Doe',
            'email'           => 'jane.doe@example.com',
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertStatus(422);
        Mail::assertNothingSent();
    }

    public function test_single_invite_rejects_a_salutation_not_in_the_allowed_list(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/invite', [
            'salutation'      => 'Mister',
            'first_name'      => 'Jane',
            'last_name'       => 'Doe',
            'email'           => 'jane.doe@example.com',
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertStatus(422);
        Mail::assertNothingSent();
    }

    public function test_non_admin_cannot_invite_a_speaker(): void
    {
        Mail::fake();
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $response = $this->actingAs($student, 'sanctum')->postJson('/api/admin/invite', [
            'salutation'      => 'Frau',
            'first_name'      => 'Jane',
            'last_name'       => 'Doe',
            'email'           => 'jane.doe@example.com',
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertForbidden();
        Mail::assertNothingSent();
    }

    public function test_admin_can_bulk_invite_speakers_from_a_csv(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $csv = "salutation,firstname,lastname,email\n"
            . "Frau,Jane,Doe,jane.doe@example.com\n"
            . "Herr,John,Smith,john.smith@example.com\n";
        $file = UploadedFile::fake()->createWithContent('speakers.csv', $csv);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/invite/bulk', [
            'csv'             => $file,
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertOk();
        $response->assertJson([
            'invited_count' => 2,
            'invited'       => ['jane.doe@example.com', 'john.smith@example.com'],
            'skipped'       => [],
        ]);
        $this->assertDatabaseHas('users', ['email' => 'jane.doe@example.com', 'role' => User::ROLE_CONSULTANT]);
        $this->assertDatabaseHas('consultant_profiles', ['salutation' => 'Frau', 'first_name' => 'Jane']);
        $this->assertDatabaseHas('users', ['email' => 'john.smith@example.com', 'role' => User::ROLE_CONSULTANT]);
        $this->assertDatabaseHas('consultant_profiles', ['salutation' => 'Herr', 'first_name' => 'John']);
        Mail::assertSent(SpeakerInvitation::class, 2);
    }

    public function test_bulk_invite_skips_rows_with_invalid_or_duplicate_emails(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'existing@example.com']);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $csv = "salutation,firstname,lastname,email\n"
            . "Frau,Jane,Doe,jane.doe@example.com\n"
            . "Herr,Bad,Row,not-an-email\n"
            . "Herr,Already,Registered,existing@example.com\n"
            . "Frau,Jane,Doe,jane.doe@example.com\n"; // duplicate within the same file
        $file = UploadedFile::fake()->createWithContent('speakers.csv', $csv);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/invite/bulk', [
            'csv'             => $file,
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('invited_count', 1);
        $response->assertJsonPath('invited', ['jane.doe@example.com']);
        $this->assertCount(3, $response->json('skipped'));
        Mail::assertSent(SpeakerInvitation::class, 1);
    }

    public function test_bulk_invite_skips_rows_missing_a_salutation(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $csv = "salutation,firstname,lastname,email\n"
            . ",Jane,Doe,jane.doe@example.com\n"
            . "Herr,John,Smith,john.smith@example.com\n";
        $file = UploadedFile::fake()->createWithContent('speakers.csv', $csv);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/invite/bulk', [
            'csv'             => $file,
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('invited_count', 1);
        $response->assertJsonPath('invited', ['john.smith@example.com']);
        $this->assertCount(1, $response->json('skipped'));
    }

    public function test_bulk_invite_replaces_the_name_placeholder_per_row(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $csv = "salutation,firstname,lastname,email\n"
            . "Frau,Jane,Doe,jane.doe@example.com\n"
            . "(ohne),John,Smith,john.smith@example.com\n";
        $file = UploadedFile::fake()->createWithContent('speakers.csv', $csv);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/invite/bulk', [
            'csv'             => $file,
            'invitation_body' => 'Dear $NAME, please join us.',
        ]);

        $response->assertOk();
        Mail::assertSent(SpeakerInvitation::class, function (SpeakerInvitation $mail) {
            return $mail->firstName === 'Jane' && $mail->body === 'Dear Frau Doe, please join us.';
        });
        Mail::assertSent(SpeakerInvitation::class, function (SpeakerInvitation $mail) {
            return $mail->firstName === 'John' && $mail->body === 'Dear Smith, please join us.';
        });
    }

    public function test_bulk_invite_skips_rows_with_a_salutation_not_in_the_allowed_list(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $csv = "salutation,firstname,lastname,email\n"
            . "Mister,Jane,Doe,jane.doe@example.com\n"
            . "Herr,John,Smith,john.smith@example.com\n";
        $file = UploadedFile::fake()->createWithContent('speakers.csv', $csv);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/invite/bulk', [
            'csv'             => $file,
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('invited_count', 1);
        $response->assertJsonPath('invited', ['john.smith@example.com']);
        $this->assertCount(1, $response->json('skipped'));
    }

    public function test_bulk_invite_skips_blank_lines(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $csv = "salutation,firstname,lastname,email\n"
            . "Frau,Jane,Doe,jane.doe@example.com\n"
            . "\n"
            . "Herr,John,Smith,john.smith@example.com\n";
        $file = UploadedFile::fake()->createWithContent('speakers.csv', $csv);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/invite/bulk', [
            'csv'             => $file,
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('invited_count', 2);
    }

    public function test_non_admin_cannot_bulk_invite_speakers(): void
    {
        Mail::fake();
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $csv = "salutation,firstname,lastname,email\nFrau,Jane,Doe,jane.doe@example.com\n";
        $file = UploadedFile::fake()->createWithContent('speakers.csv', $csv);

        $response = $this->actingAs($student, 'sanctum')->post('/api/admin/invite/bulk', [
            'csv'             => $file,
            'invitation_body' => 'Please join us as a speaker.',
        ]);

        $response->assertForbidden();
        Mail::assertNothingSent();
    }
}
