<!DOCTYPE html>
<html lang="{{ $language }}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #f4f4f5; margin: 0; padding: 2rem 1rem; }
    .card { background: #fff; border-radius: 8px; max-width: 520px; margin: 0 auto; padding: 2rem 2.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    h1 { font-size: 1.25rem; color: #1a1a2e; margin: 0 0 1.25rem; }
    p { color: #374151; line-height: 1.7; margin: 0 0 1rem; }
    .btn { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .note { margin-top: 1.5rem; font-size: 0.8rem; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    @if ($language === 'fr')
      <h1>Bonjour {{ $firstName }},</h1>
      <p>Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p>
      <a href="{{ $link }}" class="btn">Réinitialiser mon mot de passe</a>
      <p class="note">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail — votre mot de passe restera inchangé.</p>
    @else
      <h1>Hallo {{ $firstName }},</h1>
      <p>Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Klicke auf die Schaltfläche unten, um ein neues Passwort festzulegen:</p>
      <a href="{{ $link }}" class="btn">Passwort zurücksetzen</a>
      <p class="note">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren — dein Passwort bleibt unverändert.</p>
    @endif
  </div>
</body>
</html>
