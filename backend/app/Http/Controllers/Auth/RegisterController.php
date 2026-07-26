<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RegisterController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            // Students never self-register with a password — they always log in via LDAP username,
            // provisioned by the admin's CSV import. Only consultant self-registration remains here.
            'role'     => ['required', Rule::in([User::ROLE_CONSULTANT])],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => $validated['password'],
            'role'     => $validated['role'],
        ]);

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email sent.'], 201);
    }
}
