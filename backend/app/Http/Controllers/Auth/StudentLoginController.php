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

class StudentLoginController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        return AppSetting::getBool('ldap_students')
            ? $this->loginViaLdap($request)
            : $this->loginViaPassword($request);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
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
                'role' => User::ROLE_STUDENT,
                'password' => null,
            ]
        );

        $user->update([
            'name' => $ldapUser['displayName'] ?? $ldapUser['cn'] ?? $username,
            'email' => $ldapUser['mail'] ?? $user->email,
        ]);

        $token = $user->createToken('student-token', ['role:student'])->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    private function loginViaPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt(['email' => $request->input('email'), 'password' => $request->input('password')])) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->isStudent()) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['This login is only for students.'],
            ]);
        }

        $token = $user->createToken('student-token', ['role:student'])->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    private function authenticateViaLdap(string $username, string $password): bool
    {
        try {
            /** @var Connection $connection */
            $connection = Container::getDefaultConnection();
            $userDn = $this->buildUserDn($username);
            $connection->auth()->attempt($userDn, $password, true);
            return true;
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

    private function buildUserDn(string $username): string
    {
        $baseDn = config('ldap.connections.default.base_dn');
        return "uid={$username},{$baseDn}";
    }
}
