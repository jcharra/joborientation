<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultantSessionController extends Controller
{
    public const VALID_SLOTS = [
        'in_person_1330', 'in_person_1430', 'in_person_1530', 'in_person_1630',
        'video_1330',     'video_1430',     'video_1530',     'video_1630',
        'reception_1745',
    ];

    public function show(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->topics()->with('tag')->first()
        );
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'selected_slots' => ['required', 'array', 'min:1'],
            'selected_slots.*' => ['required', 'string', 'in:' . implode(',', self::VALID_SLOTS)],
        ]);

        $topic = Topic::updateOrCreate(
            ['consultant_id' => $request->user()->id],
            $validated,
        );

        return response()->json($topic->fresh(['tag']));
    }
}
