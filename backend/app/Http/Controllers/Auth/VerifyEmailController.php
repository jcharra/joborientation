<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url');

        if (!$request->hasValidSignature()) {
            return redirect("{$frontendUrl}/email/verified?error=invalid");
        }

        $user = User::findOrFail($id);

        if (!hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return redirect("{$frontendUrl}/email/verified?error=invalid");
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return redirect("{$frontendUrl}/email/verified?token={$token}&role={$user->role}");
    }
}
