<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginRecordsLastLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_password_login_records_last_login_at(): void
    {
        $student = User::factory()->create([
            'role' => User::ROLE_STUDENT,
            'email' => 'student@example.com',
            'password' => Hash::make('password'),
        ]);
        $this->assertNull($student->last_login_at);

        $response = $this->postJson('/api/auth/student/login', [
            'email' => 'student@example.com',
            'password' => 'password',
        ]);

        $response->assertOk();
        $this->assertNotNull($student->fresh()->last_login_at);
    }

    public function test_consultant_password_login_records_last_login_at(): void
    {
        $consultant = User::factory()->create([
            'role' => User::ROLE_CONSULTANT,
            'email' => 'consultant@example.com',
            'password' => Hash::make('password'),
        ]);
        $this->assertNull($consultant->last_login_at);

        $response = $this->postJson('/api/auth/consultant/login', [
            'email' => 'consultant@example.com',
            'password' => 'password',
        ]);

        $response->assertOk();
        $this->assertNotNull($consultant->fresh()->last_login_at);
    }

    public function test_failed_login_does_not_record_last_login_at(): void
    {
        $student = User::factory()->create([
            'role' => User::ROLE_STUDENT,
            'email' => 'student@example.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/auth/student/login', [
            'email' => 'student@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertNull($student->fresh()->last_login_at);
    }
}
