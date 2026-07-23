<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEventDetailsController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_datetime' => 'nullable|date',
            'event_location' => 'nullable|string|max:255',
        ]);

        AppSetting::set('event_datetime', $validated['event_datetime'] ?? null);
        AppSetting::set('event_location', $validated['event_location'] ?? null);

        return response()->json([
            'event_datetime' => $validated['event_datetime'] ?? null,
            'event_location' => $validated['event_location'] ?? null,
        ]);
    }
}
