<?php

namespace App\Http\Controllers;

use App\Models\Series;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSeriesController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:series,name'],
        ]);

        $series = Series::create($validated);

        return response()->json($series, 201);
    }

    public function update(Request $request, Series $series): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('series', 'name')->ignore($series->id)],
        ]);

        $series->update($validated);

        return response()->json($series);
    }

    public function destroy(Series $series): JsonResponse
    {
        $series->delete();

        return response()->json(['message' => 'Series deleted.']);
    }
}
