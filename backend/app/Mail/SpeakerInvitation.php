<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SpeakerInvitation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $firstName,
        public readonly string $body,
        public readonly string $link,
        public readonly string $language = 'de',
        public readonly ?string $replyToEmail = null,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->language === 'fr'
            ? 'Vous êtes invité(e) — ' . config('app.name')
            : 'Du bist eingeladen — ' . config('app.name');

        return new Envelope(
            subject: $subject,
            replyTo: $this->replyToEmail ? [$this->replyToEmail] : [],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.speaker-invitation');
    }
}
