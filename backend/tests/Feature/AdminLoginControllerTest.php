<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminLoginControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_log_in_with_email_and_password(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'email' => 'admin@example.com',
            'password' => bcrypt('admin-pass'),
        ]);

        $response = $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'admin-pass',
        ]);

        $response->assertOk();
        $this->assertSame($admin->id, $response->json('user.id'));
        $this->assertNotNull($admin->fresh()->last_login_at);
    }

    public function test_admin_login_rejects_a_wrong_password(): void
    {
        User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'email' => 'admin@example.com',
            'password' => bcrypt('admin-pass'),
        ]);

        $response = $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-pass',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_login_error_is_german_by_default(): void
    {
        User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'email' => 'admin@example.com',
            'password' => bcrypt('admin-pass'),
        ]);

        $response = $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-pass',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['email' => ['Die angegebenen Zugangsdaten sind falsch.']]);
    }

    public function test_admin_login_error_is_french_when_requested_via_accept_language_header(): void
    {
        User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'email' => 'admin@example.com',
            'password' => bcrypt('admin-pass'),
        ]);

        $response = $this->withHeader('Accept-Language', 'fr')->postJson('/api/auth/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-pass',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['email' => ['Les identifiants fournis sont incorrects.']]);
    }

    public function test_a_consultant_cannot_log_in_via_the_admin_endpoint(): void
    {
        User::factory()->create([
            'role' => User::ROLE_CONSULTANT,
            'email' => 'consultant@example.com',
            'password' => bcrypt('consultant-pass'),
        ]);

        $response = $this->postJson('/api/auth/admin/login', [
            'email' => 'consultant@example.com',
            'password' => 'consultant-pass',
        ]);

        $response->assertStatus(422);
    }

    public function test_a_student_cannot_log_in_via_the_admin_endpoint(): void
    {
        User::factory()->create([
            'role' => User::ROLE_STUDENT,
            'email' => 'student@example.com',
            'password' => bcrypt('student-pass'),
        ]);

        $response = $this->postJson('/api/auth/admin/login', [
            'email' => 'student@example.com',
            'password' => 'student-pass',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_can_fetch_their_own_profile_and_log_out(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        Sanctum::actingAs($admin, ['role:admin']);

        $response = $this->getJson('/api/auth/admin/me');
        $response->assertOk();
        $response->assertJsonPath('id', $admin->id);

        $logoutResponse = $this->postJson('/api/auth/admin/logout');
        $logoutResponse->assertOk();
    }
}
