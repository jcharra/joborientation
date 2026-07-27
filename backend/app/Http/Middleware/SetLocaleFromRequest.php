<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleFromRequest
{
    private const SUPPORTED_LOCALES = ['de', 'fr'];

    public function handle(Request $request, Closure $next): Response
    {
        $requested = strtolower(substr((string) $request->header('Accept-Language', ''), 0, 2));

        app()->setLocale(in_array($requested, self::SUPPORTED_LOCALES, true) ? $requested : 'de');

        return $next($request);
    }
}
