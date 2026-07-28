<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\JsonResponse;

class StudentTopicController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Topic::with(['tag', 'timeSlots', 'consultant.consultantProfile'])->get()
        );
    }
}
