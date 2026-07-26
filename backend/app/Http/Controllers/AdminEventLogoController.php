<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEventLogoController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $path = $request->file('logo')->store('event-logo', 'public');

        AppSetting::set('event_logo_path', $path);

        return response()->json(['event_logo_url' => '/storage/' . $path]);
    }

    public function destroy(): JsonResponse
    {
        AppSetting::set('event_logo_path', null);

        return response()->json(['event_logo_url' => null]);
    }
}
