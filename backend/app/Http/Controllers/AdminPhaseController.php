<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPhaseController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phase' => 'required|in:preparation,selection,conference',
        ]);

        AppSetting::set('current_phase', $validated['phase']);

        return response()->json(['current_phase' => $validated['phase']]);
    }
}
