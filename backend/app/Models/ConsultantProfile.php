<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultantProfile extends Model
{
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'phone',
        'graduation_year',
        'serie',
        'linkedin_url',
        'career_path',
        'current_situation',
        'why_this_career',
        'about_me',
        'cv_path',
        'profile_picture_path',
        'consent_poster',
        'consent_alumni_data',
    ];

    protected $appends = ['profile_picture_url'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function profilePictureUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->profile_picture_path
                ? '/storage/' . $this->profile_picture_path
                : null,
        );
    }
}
