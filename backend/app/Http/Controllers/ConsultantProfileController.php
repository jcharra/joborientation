<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\ConsultantProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConsultantProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('consultantProfile');

        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            'profile' => $user->consultantProfile,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $graduationYearMin = (int) AppSetting::get('graduation_year_min', 1990);
        $graduationYearMax = (int) AppSetting::get('graduation_year_max', 2050);

        $validated = $request->validate([
            'first_name'       => ['nullable', 'string', 'max:100'],
            'last_name'        => ['nullable', 'string', 'max:100'],
            'phone'            => ['nullable', 'string', 'max:30'],
            'graduation_year'  => ['nullable', 'integer', "min:{$graduationYearMin}", "max:{$graduationYearMax}"],
            'serie'            => ['nullable', Rule::exists('series', 'name')],
            'linkedin_url'     => ['nullable', 'url', 'max:255'],
            'career_path'        => ['nullable', 'string'],
            'current_situation'  => ['nullable', 'string'],
            'why_this_career'    => ['nullable', 'string'],
            'consent_poster'     => ['nullable', 'boolean'],
            'consent_alumni_data'=> ['nullable', 'boolean'],
            'profile_picture'    => ['nullable', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        $data = collect($validated)->except('profile_picture')->toArray();

        if ($request->hasFile('profile_picture')) {
            $data['profile_picture_path'] = $request->file('profile_picture')
                ->store('profile-pictures', 'public');
        }

        $profile = ConsultantProfile::updateOrCreate(
            ['user_id' => $user->id],
            $data
        );

        return response()->json($profile->fresh());
    }
}
