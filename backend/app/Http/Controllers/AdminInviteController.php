<?php

namespace App\Http\Controllers;

use App\Mail\SpeakerInvitation;
use App\Models\ConsultantProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AdminInviteController extends Controller
{
    public function invite(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'email'           => 'required|email|unique:users,email',
            'invitation_body' => 'required|string|max:3000',
        ]);

        $user = User::create([
            'name'     => $validated['first_name'] . ' ' . $validated['last_name'],
            'email'    => $validated['email'],
            'role'     => User::ROLE_CONSULTANT,
            'password' => Hash::make(Str::random(32)),
        ]);

        ConsultantProfile::create([
            'user_id'    => $user->id,
            'first_name' => $validated['first_name'],
            'last_name'  => $validated['last_name'],
        ]);

        $token    = Password::createToken($user);
        $link     = env('FRONTEND_URL', 'http://localhost:5173')
            . '/set-password?token=' . $token
            . '&email=' . urlencode($user->email);

        Mail::to($user->email)->send(
            new SpeakerInvitation($validated['first_name'], $validated['invitation_body'], $link)
        );

        return response()->json(['message' => 'Invitation sent.']);
    }
}
