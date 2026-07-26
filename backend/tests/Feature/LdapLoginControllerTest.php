<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LdapRecord\Testing\DirectoryFake;
use LdapRecord\Testing\LdapFake;
use Tests\TestCase;

class LdapLoginControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        DirectoryFake::tearDown();
        parent::tearDown();
    }

    public function test_student_can_log_in_via_ldap_with_the_correct_password(): void
    {
        AppSetting::set('ldap_students', 'true');

        $fake = DirectoryFake::setup();
        $dn = 'uid=jdoe,' . config('ldap.connections.default.base_dn');

        $fake->getLdapConnection()->expect(
            LdapFake::operation('bind')->with($dn, 'correct-password')->andReturnResponse()
        );

        $response = $this->postJson('/api/auth/student/login', [
            'username' => 'jdoe',
            'password' => 'correct-password',
        ]);

        $response->assertOk();
        $this->assertSame(User::ROLE_STUDENT, User::where('ldap_username', 'jdoe')->first()->role);
    }

    public function test_student_login_via_ldap_rejects_a_wrong_password(): void
    {
        AppSetting::set('ldap_students', 'true');

        $fake = DirectoryFake::setup();
        $dn = 'uid=jdoe,' . config('ldap.connections.default.base_dn');

        $fake->getLdapConnection()->expect(
            LdapFake::operation('bind')->with($dn, 'wrong-password')->andReturnErrorResponse(49, 'Invalid credentials')
        );

        $response = $this->postJson('/api/auth/student/login', [
            'username' => 'jdoe',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertNull(User::where('ldap_username', 'jdoe')->first());
    }

    public function test_consultant_can_log_in_via_ldap_with_the_correct_password(): void
    {
        AppSetting::set('ldap_consultants', 'true');

        $fake = DirectoryFake::setup();
        $dn = 'uid=jsmith,' . config('ldap.connections.default.base_dn');

        $fake->getLdapConnection()->expect(
            LdapFake::operation('bind')->with($dn, 'correct-password')->andReturnResponse()
        );

        $response = $this->postJson('/api/auth/consultant/login', [
            'username' => 'jsmith',
            'password' => 'correct-password',
        ]);

        $response->assertOk();
    }

    public function test_consultant_login_via_ldap_rejects_a_wrong_password(): void
    {
        AppSetting::set('ldap_consultants', 'true');

        $fake = DirectoryFake::setup();
        $dn = 'uid=jsmith,' . config('ldap.connections.default.base_dn');

        $fake->getLdapConnection()->expect(
            LdapFake::operation('bind')->with($dn, 'wrong-password')->andReturnErrorResponse(49, 'Invalid credentials')
        );

        $response = $this->postJson('/api/auth/consultant/login', [
            'username' => 'jsmith',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_logs_in_with_email_and_password_even_when_ldap_consultants_is_enabled(): void
    {
        AppSetting::set('ldap_consultants', 'true');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'email' => 'admin@example.com', 'password' => bcrypt('admin-pass')]);

        // No LDAP expectations are set up at all — if the request were routed through LDAP this
        // would throw an "unexpected method call" exception instead of succeeding.
        DirectoryFake::setup();

        $response = $this->postJson('/api/auth/consultant/login', [
            'email' => 'admin@example.com',
            'password' => 'admin-pass',
        ]);

        $response->assertOk();
        $this->assertSame($admin->id, $response->json('user.id'));
    }

    public function test_admin_logs_in_with_email_and_password_even_when_ldap_students_is_enabled(): void
    {
        AppSetting::set('ldap_students', 'true');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'email' => 'admin@example.com', 'password' => bcrypt('admin-pass')]);

        DirectoryFake::setup();

        // The student endpoint only accepts students via password login, but the point here is that
        // it must reject this on role grounds via loginViaPassword — never attempt LDAP for it.
        $response = $this->postJson('/api/auth/student/login', [
            'email' => 'admin@example.com',
            'password' => 'admin-pass',
        ]);

        $response->assertStatus(422);
        $this->assertNotNull($admin->fresh());
    }

    public function test_ldap_consultant_login_is_rejected_if_the_matched_user_is_an_admin(): void
    {
        AppSetting::set('ldap_consultants', 'true');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'ldap_username' => 'jdoe']);

        $fake = DirectoryFake::setup();
        $dn = 'uid=jdoe,' . config('ldap.connections.default.base_dn');
        $fake->getLdapConnection()->expect(
            LdapFake::operation('bind')->with($dn, 'correct-password')->andReturnResponse()
        );

        $response = $this->postJson('/api/auth/consultant/login', [
            'username' => 'jdoe',
            'password' => 'correct-password',
        ]);

        $response->assertStatus(422);
        $this->assertSame(User::ROLE_ADMIN, $admin->fresh()->role);
    }

    public function test_ldap_student_login_is_rejected_if_the_matched_user_is_an_admin(): void
    {
        AppSetting::set('ldap_students', 'true');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'ldap_username' => 'jdoe']);

        $fake = DirectoryFake::setup();
        $dn = 'uid=jdoe,' . config('ldap.connections.default.base_dn');
        $fake->getLdapConnection()->expect(
            LdapFake::operation('bind')->with($dn, 'correct-password')->andReturnResponse()
        );

        $response = $this->postJson('/api/auth/student/login', [
            'username' => 'jdoe',
            'password' => 'correct-password',
        ]);

        $response->assertStatus(422);
        $this->assertSame(User::ROLE_ADMIN, $admin->fresh()->role);
    }

    public function test_a_students_own_password_cannot_bypass_a_mandated_ldap_students_flag(): void
    {
        AppSetting::set('ldap_students', 'true');
        // A student who self-registered (or was created) before LDAP was turned on: real password,
        // verified email — everything loginViaPassword() would normally accept.
        User::factory()->create([
            'role' => User::ROLE_STUDENT,
            'email' => 'student@example.com',
            'password' => bcrypt('student-pass'),
            'email_verified_at' => now(),
        ]);

        // No LDAP expectations are set up — the request must fail on missing `username`, not attempt
        // an LDAP bind at all, and it must not silently fall back to the password path either.
        DirectoryFake::setup();

        $response = $this->postJson('/api/auth/student/login', [
            'email' => 'student@example.com',
            'password' => 'student-pass',
        ]);

        $response->assertStatus(422);
    }

    public function test_a_consultants_own_password_cannot_bypass_a_mandated_ldap_consultants_flag(): void
    {
        AppSetting::set('ldap_consultants', 'true');
        User::factory()->create([
            'role' => User::ROLE_CONSULTANT,
            'email' => 'consultant@example.com',
            'password' => bcrypt('consultant-pass'),
            'email_verified_at' => now(),
        ]);

        DirectoryFake::setup();

        $response = $this->postJson('/api/auth/consultant/login', [
            'email' => 'consultant@example.com',
            'password' => 'consultant-pass',
        ]);

        $response->assertStatus(422);
    }
}
