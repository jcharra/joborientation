<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireStudent
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isStudent()) {
            return response()->json(['message' => __('messages.forbidden')], 403);
        }

        return $next($request);
    }
}
