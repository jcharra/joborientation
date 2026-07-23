<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminGraduationYearRangeController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'min' => 'required|integer|min:1900|max:2100',
            'max' => 'required|integer|min:1900|max:2100|gte:min',
        ]);

        AppSetting::set('graduation_year_min', (string) $validated['min']);
        AppSetting::set('graduation_year_max', (string) $validated['max']);

        return response()->json([
            'min' => $validated['min'],
            'max' => $validated['max'],
        ]);
    }
}
