<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\SpeakerPasswordReset;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $user = User::with('consultantProfile')
            ->where('email', $request->input('email'))
            ->where('role', User::ROLE_CONSULTANT)
            ->first();

        if ($user) {
            $language = $user->consultantProfile?->language ?? 'de';

            $token = Password::createToken($user);
            $link  = env('FRONTEND_URL', 'http://localhost:5173')
                . '/set-password?token=' . $token
                . '&email=' . urlencode($user->email)
                . '&lang=' . $language;

            Mail::to($user->email)->send(new SpeakerPasswordReset($user->first_name ?? $user->name, $link, $language));
        }

        // Always return success to avoid leaking whether an email exists
        return response()->json(['message' => __('messages.password_reset_email_sent')]);
    }
}
