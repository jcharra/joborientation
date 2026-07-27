<?php

namespace Tests\Feature;

use App\Mail\SpeakerPasswordReset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ForgotPasswordControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_a_reset_email_for_an_existing_speaker(): void
    {
        Mail::fake();
        $consultant = User::factory()->create(['role' => User::ROLE_CONSULTANT, 'email' => 'speaker@example.com']);

        $response = $this->postJson('/api/auth/consultant/forgot-password', ['email' => 'speaker@example.com']);

        $response->assertOk();
        Mail::assertSent(SpeakerPasswordReset::class, function (SpeakerPasswordReset $mail) use ($consultant) {
            return str_contains($mail->link, '/set-password?token=')
                && str_contains($mail->link, 'email=' . urlencode($consultant->email));
        });
    }

    public function test_returns_success_without_sending_mail_for_an_unknown_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/consultant/forgot-password', ['email' => 'nobody@example.com']);

        $response->assertOk();
        Mail::assertNothingSent();
    }

    public function test_does_not_send_a_reset_email_for_a_non_consultant_account(): void
    {
        Mail::fake();
        User::factory()->create(['role' => User::ROLE_STUDENT, 'email' => 'student@example.com']);

        $response = $this->postJson('/api/auth/consultant/forgot-password', ['email' => 'student@example.com']);

        $response->assertOk();
        Mail::assertNothingSent();
    }

    public function test_requires_a_valid_email_format(): void
    {
        $response = $this->postJson('/api/auth/consultant/forgot-password', ['email' => 'not-an-email']);

        $response->assertStatus(422);
    }

    public function test_the_generated_link_can_be_used_to_set_a_new_password(): void
    {
        Mail::fake();
        User::factory()->create(['role' => User::ROLE_CONSULTANT, 'email' => 'speaker@example.com']);

        $this->postJson('/api/auth/consultant/forgot-password', ['email' => 'speaker@example.com']);

        $token = null;
        Mail::assertSent(SpeakerPasswordReset::class, function (SpeakerPasswordReset $mail) use (&$token) {
            parse_str(parse_url($mail->link, PHP_URL_QUERY), $params);
            $token = $params['token'];
            return true;
        });

        $response = $this->postJson('/api/auth/invitation/accept', [
            'email' => 'speaker@example.com',
            'token' => $token,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['token', 'user']);
    }
}
