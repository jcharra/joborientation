<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTopicController extends Controller
{
    public function updateTag(Request $request, Topic $topic): JsonResponse
    {
        $validated = $request->validate([
            'tag_id' => ['required', 'integer', 'exists:tags,id'],
        ]);

        $topic->update($validated);

        return response()->json($topic->fresh()->load('tag'));
    }
}
