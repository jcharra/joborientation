<?php

namespace App\Http\Controllers;

use App\Mail\SpeakerInvitation;
use App\Models\ConsultantProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminInviteController extends Controller
{
    public const SALUTATIONS = [
        'Herr',
        'Frau',
        '(ohne)',
        'Herr Dr.',
        'Frau Dr.',
        'Dr.',
        'Herr Prof. Dr.',
        'Frau Prof. Dr.',
        'Prof. Dr.',
    ];

    public function invite(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'salutation'      => ['required', 'string', Rule::in(self::SALUTATIONS)],
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'email'           => 'required|email|unique:users,email',
            'invitation_body' => 'required|string|max:3000',
        ]);

        $this->createAndInviteSpeaker(
            $validated['salutation'],
            $validated['first_name'],
            $validated['last_name'],
            $validated['email'],
            $validated['invitation_body'],
        );

        return response()->json(['message' => 'Invitation sent.']);
    }

    public function bulkInvite(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'csv'             => ['required', 'file', 'mimes:csv,txt'],
            'invitation_body' => ['required', 'string', 'max:3000'],
        ]);

        $invited = [];
        $skipped = [];

        foreach ($this->parseCsv($validated['csv']) as $row) {
            [$salutation, $firstName, $lastName, $email] = $row;

            $rowValidator = Validator::make(
                ['salutation' => $salutation, 'first_name' => $firstName, 'last_name' => $lastName, 'email' => $email],
                [
                    'salutation' => ['required', 'string', Rule::in(self::SALUTATIONS)],
                    'first_name' => ['required', 'string', 'max:100'],
                    'last_name'  => ['required', 'string', 'max:100'],
                    'email'      => ['required', 'email', 'unique:users,email'],
                ]
            );

            if ($rowValidator->fails()) {
                $skipped[] = ['email' => $email, 'reason' => implode(' ', $rowValidator->errors()->all())];

                continue;
            }

            $this->createAndInviteSpeaker($salutation, $firstName, $lastName, $email, $validated['invitation_body']);
            $invited[] = $email;
        }

        return response()->json([
            'invited_count' => count($invited),
            'invited'       => $invited,
            'skipped'       => $skipped,
        ]);
    }

    /** @return array<int, array{0: string, 1: string, 2: string, 3: string}> */
    private function parseCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        $rows = [];

        fgetcsv($handle); // skip header row (salutation, firstname, lastname, email)

        while (($row = fgetcsv($handle)) !== false) {
            if (count(array_filter($row, fn ($cell) => trim((string) $cell) !== '')) === 0) {
                continue;
            }

            $rows[] = [
                trim($row[0] ?? ''),
                trim($row[1] ?? ''),
                trim($row[2] ?? ''),
                trim($row[3] ?? ''),
            ];
        }

        fclose($handle);

        return $rows;
    }

    private function nameForPlaceholder(string $salutation, string $lastName): string
    {
        return $salutation === '(ohne)' ? $lastName : $salutation . ' ' . $lastName;
    }

    private function createAndInviteSpeaker(string $salutation, string $firstName, string $lastName, string $email, string $invitationBody): void
    {
        $user = User::create([
            'name'     => $firstName . ' ' . $lastName,
            'email'    => $email,
            'role'     => User::ROLE_CONSULTANT,
            'password' => Hash::make(Str::random(32)),
        ]);

        ConsultantProfile::create([
            'user_id'    => $user->id,
            'salutation' => $salutation,
            'first_name' => $firstName,
            'last_name'  => $lastName,
        ]);

        $token = Password::createToken($user);
        $link  = env('FRONTEND_URL', 'http://localhost:5173')
            . '/set-password?token=' . $token
            . '&email=' . urlencode($user->email);

        $personalizedBody = str_replace('$NAME', $this->nameForPlaceholder($salutation, $lastName), $invitationBody);

        Mail::to($user->email)->send(new SpeakerInvitation($firstName, $personalizedBody, $link));
    }
}
