<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEventTitleController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'en' => 'required|string|max:150',
            'de' => 'required|string|max:150',
            'fr' => 'required|string|max:150',
        ]);

        AppSetting::set('event_title_en', $validated['en']);
        AppSetting::set('event_title_de', $validated['de']);
        AppSetting::set('event_title_fr', $validated['fr']);

        return response()->json(['event_title' => $validated]);
    }
}
