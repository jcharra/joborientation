<?php

namespace App\Http\Controllers;

use App\Models\SlotOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSlotOptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kind' => ['required', Rule::in(SlotOption::KINDS)],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ]);

        $slotOption = SlotOption::create($validated);

        return response()->json($slotOption, 201);
    }

    public function update(Request $request, SlotOption $slotOption): JsonResponse
    {
        $validated = $request->validate([
            'kind' => ['required', Rule::in(SlotOption::KINDS)],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ]);

        $slotOption->update($validated);

        return response()->json($slotOption);
    }

    public function destroy(SlotOption $slotOption): JsonResponse
    {
        $slotOption->delete();

        return response()->json(['message' => 'Slot option deleted.']);
    }
}
