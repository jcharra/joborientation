<?php

namespace App\Http\Controllers;

use App\Models\Series;
use Illuminate\Http\JsonResponse;

class SeriesController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Series::orderBy('name')->get()
        );
    }
}
