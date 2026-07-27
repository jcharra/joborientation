<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPhaseDatesController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'selection_phase_start' => 'nullable|date',
            'conference_phase_start' => 'nullable|date',
        ]);

        AppSetting::set('selection_phase_start', $validated['selection_phase_start'] ?? null);
        AppSetting::set('conference_phase_start', $validated['conference_phase_start'] ?? null);

        return response()->json([
            'selection_phase_start' => $validated['selection_phase_start'] ?? null,
            'conference_phase_start' => $validated['conference_phase_start'] ?? null,
        ]);
    }
}
