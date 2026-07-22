<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Use APP_URL as the base for all generated URLs so that requests
        // proxied through Docker/nginx (Host: nginx) don't pollute signed URLs.
        URL::forceRootUrl(config('app.url'));

        // Email verification link opens the frontend SPA; the SPA page then
        // calls the API with the same path + query to complete verification.
        VerifyEmail::createUrlUsing(function ($notifiable) {
            $id   = $notifiable->getKey();
            $hash = sha1($notifiable->getEmailForVerification());

            // Generate a signed backend URL to obtain expires + signature, then
            // rebase to the frontend so the user lands in the SPA on click.
            $backendUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                ['id' => $id, 'hash' => $hash]
            );

            $query    = parse_url($backendUrl, PHP_URL_QUERY); // expires=...&signature=...
            $frontend = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

            return "{$frontend}/email/verify/{$id}/{$hash}?{$query}";
        });
    }
}
