<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\SlotOption;
use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConsultantSessionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->topics()->with('tag', 'timeSlots')->first()
        );
    }

    public function update(Request $request): JsonResponse
    {
        if (AppSetting::isConferencePhase()) {
            return response()->json(['message' => 'The session can no longer be edited during the conference phase.'], 403);
        }

        $validated = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:200'],
            'selected_slots' => ['required', 'array', 'min:1'],
            'selected_slots.*' => ['required', 'string', Rule::in(SlotOption::validSlotIds())],
        ]);

        $topic = Topic::updateOrCreate(
            ['consultant_id' => $request->user()->id],
            $validated,
        );

        return response()->json($topic->fresh(['tag', 'timeSlots']));
    }
}
