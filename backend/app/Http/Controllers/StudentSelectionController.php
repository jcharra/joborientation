<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentSelectionController extends Controller
{
    public const MIN_SELECTIONS = 1;
    public const MAX_SELECTIONS = 6;

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'topic_ids' => $request->user()->talkSelections()->orderBy('position')->pluck('topic_id'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if (! AppSetting::isSelectionPhase()) {
            return response()->json(['message' => __('messages.selection_only_during_selection_phase')], 403);
        }

        $validated = $request->validate([
            'topic_ids' => ['required', 'array', 'min:' . self::MIN_SELECTIONS, 'max:' . self::MAX_SELECTIONS],
            'topic_ids.*' => ['required', 'integer', 'distinct', 'exists:topics,id'],
        ]);

        DB::transaction(function () use ($request, $validated) {
            $request->user()->talkSelections()->delete();
            foreach ($validated['topic_ids'] as $position => $topicId) {
                $request->user()->talkSelections()->create(['topic_id' => $topicId, 'position' => $position]);
            }
        });

        return response()->json([
            'topic_ids' => $request->user()->talkSelections()->orderBy('position')->pluck('topic_id'),
        ]);
    }
}
