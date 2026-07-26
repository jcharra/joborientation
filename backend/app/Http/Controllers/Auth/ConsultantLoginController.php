<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use LdapRecord\Connection;
use LdapRecord\Container;

class ConsultantLoginController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        // Admins only ever have a local email+password account, never an LDAP one — this carve-out
        // means enabling LDAP for real consultants can never lock the admin out of their own login.
        // It's deliberately narrow (looked up by role, not just "an email field was sent") so that a
        // consultant who also has a password still can't use it to bypass a mandated
        // `ldap_consultants` flag.
        if ($request->filled('email') && $this->isAdminEmail($request->input('email'))) {
            return $this->loginViaPassword($request);
        }

        return AppSetting::getBool('ldap_consultants')
            ? $this->loginViaLdap($request)
            : $this->loginViaPassword($request);
    }

    private function isAdminEmail(string $email): bool
    {
        return User::where('email', $email)->where('role', User::ROLE_ADMIN)->exists();
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('consultantProfile'));
    }

    private function loginViaPassword(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->isConsultant() && ! $user->isAdmin()) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['This login is only for consultants.'],
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['Please verify your email address before logging in.'],
            ]);
        }

        $user->recordLogin();

        $token = $user->createToken('consultant-token', ['role:consultant'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load('consultantProfile'),
        ]);
    }

    private function loginViaLdap(Request $request): JsonResponse
    {
        $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $username = $request->input('username');
        $password = $request->input('password');

        if (! $this->authenticateViaLdap($username, $password)) {
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        $ldapUser = $this->findLdapUser($username);

        $user = User::firstOrCreate(
            ['ldap_username' => $username],
            [
                'name' => $ldapUser['displayName'] ?? $ldapUser['cn'] ?? $username,
                'email' => $ldapUser['mail'] ?? null,
                'role' => User::ROLE_CONSULTANT,
                'password' => null,
                'email_verified_at' => now(),
            ]
        );

        // Hard invariant: admin accounts must never be authenticated via LDAP, even if a row somehow
        // matched (e.g. an ldap_username set on an admin through some future/other code path).
        if ($user->isAdmin()) {
            throw ValidationException::withMessages([
                'username' => ['Admin accounts must log in with an email and password.'],
            ]);
        }

        if (! $user->isConsultant()) {
            throw ValidationException::withMessages([
                'username' => ['This login is only for consultants.'],
            ]);
        }

        $user->update([
            'name' => $ldapUser['displayName'] ?? $ldapUser['cn'] ?? $username,
            'email' => $ldapUser['mail'] ?? $user->email,
        ]);
        $user->recordLogin();

        $token = $user->createToken('consultant-token', ['role:consultant'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load('consultantProfile'),
        ]);
    }

    private function authenticateViaLdap(string $username, string $password): bool
    {
        try {
            /** @var Connection $connection */
            $connection = Container::getDefaultConnection();
            $baseDn = config('ldap.connections.default.base_dn');
            $userDn = "uid={$username},{$baseDn}";
            return $connection->auth()->attempt($userDn, $password);
        } catch (\LdapRecord\Auth\BindException $e) {
            return false;
        } catch (\Exception $e) {
            logger()->error('LDAP auth error: ' . $e->getMessage());
            return false;
        }
    }

    private function findLdapUser(string $username): array
    {
        try {
            /** @var Connection $connection */
            $connection = Container::getDefaultConnection();
            $baseDn = config('ldap.connections.default.base_dn');
            $result = $connection->query()
                ->in($baseDn)
                ->whereEquals('sAMAccountName', $username)
                ->orWhereEquals('uid', $username)
                ->firstOrFail();

            return array_map(fn ($v) => is_array($v) ? ($v[0] ?? null) : $v, $result);
        } catch (\Exception) {
            return [];
        }
    }
}
