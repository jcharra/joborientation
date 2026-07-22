<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class AcceptInvitationController extends Controller
{
    public function accept(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'                 => 'required|email',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password) {
                $user->password          = Hash::make($password);
                $user->email_verified_at = now();
                $user->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 422);
        }

        $user  = User::where('email', $validated['email'])->firstOrFail();
        $token = $user->createToken('auth')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }
}
