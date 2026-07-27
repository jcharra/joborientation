<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Replaces Laravel's default English verification email with a German one —
 * this is sent at self-registration time, before a speaker has set any
 * language preference, so it uses the app's default language like every
 * other "no preference known yet" fallback.
 */
class VerifyEmailNotification extends BaseVerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('E-Mail-Adresse bestätigen — ' . config('app.name'))
            ->greeting('Hallo,')
            ->line('Bitte klicke auf die Schaltfläche unten, um deine E-Mail-Adresse zu bestätigen.')
            ->action('E-Mail-Adresse bestätigen', $verificationUrl)
            ->line('Falls du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.');
    }
}
