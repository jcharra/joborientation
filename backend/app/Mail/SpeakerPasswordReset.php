<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SpeakerPasswordReset extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $firstName,
        public readonly string $link,
        public readonly string $language = 'de',
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->language === 'fr'
            ? 'Réinitialisez votre mot de passe — ' . config('app.name')
            : 'Passwort zurücksetzen — ' . config('app.name');

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset');
    }
}
