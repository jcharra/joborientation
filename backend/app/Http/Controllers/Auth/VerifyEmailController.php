<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    public function verify(Request $request, int $id, string $hash): JsonResponse
    {
        abort_unless($this->signatureValid($request, $id, $hash), 403, 'Invalid or expired verification link.');

        $user = User::findOrFail($id);

        abort_if(! hash_equals($hash, sha1($user->getEmailForVerification())), 403, 'Invalid verification link.');

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    private function signatureValid(Request $request, int $id, string $hash): bool
    {
        $expires   = (int) $request->query('expires', 0);
        $signature = (string) $request->query('signature', '');

        if (! $expires || ! $signature) {
            return false;
        }

        if (now()->timestamp > $expires) {
            return false;
        }

        // Rebuild the canonical URL that was signed, using APP_URL as the base
        // so this works whether the request arrives via browser, Vite proxy, or curl.
        $appUrl   = rtrim(config('app.url'), '/');
        $canonical = "{$appUrl}/api/auth/email/verify/{$id}/{$hash}?expires={$expires}";

        return hash_equals(
            hash_hmac('sha256', $canonical, config('app.key')),
            $signature
        );
    }
}
