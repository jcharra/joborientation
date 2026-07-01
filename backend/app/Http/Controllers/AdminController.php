<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function students(): JsonResponse
    {
        return response()->json(
            User::where('role', User::ROLE_STUDENT)->get()
        );
    }

    public function consultants(): JsonResponse
    {
        return response()->json(
            User::where('role', User::ROLE_CONSULTANT)
                ->with('consultantProfile')
                ->get()
        );
    }

    public function topics(): JsonResponse
    {
        return response()->json(
            Topic::with(['tag', 'consultant'])->get()
        );
    }
}
