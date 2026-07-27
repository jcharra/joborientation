<?php

namespace App\Http\Controllers;

use App\Models\SlotOption;
use Illuminate\Http\JsonResponse;

class SlotOptionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            SlotOption::orderBy('kind')->orderBy('start_time')->get()
        );
    }
}
