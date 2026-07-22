<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #f4f4f5; margin: 0; padding: 2rem 1rem; }
    .card { background: #fff; border-radius: 8px; max-width: 520px; margin: 0 auto; padding: 2rem 2.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    h1 { font-size: 1.25rem; color: #1a1a2e; margin: 0 0 1.25rem; }
    p { color: #374151; line-height: 1.7; margin: 0 0 1rem; white-space: pre-wrap; }
    .btn { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .note { margin-top: 1.5rem; font-size: 0.8rem; color: #9ca3af; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 1.5rem 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello {{ $firstName }},</h1>
    <p>{{ $body }}</p>
    <hr class="divider">
    <p>Click the button below to set your password and activate your account:</p>
    <a href="{{ $link }}" class="btn">Set my password</a>
    <p class="note">This link is valid for 7 days. If you were not expecting this email, you can safely ignore it.</p>
  </div>
</body>
</html>
