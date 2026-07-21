<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topic extends Model
{
    protected $fillable = ['title', 'description', 'consultant_id', 'tag_id', 'selected_slots'];

    protected function casts(): array
    {
        return ['selected_slots' => 'array'];
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'consultant_id');
    }

    public function tag(): BelongsTo
    {
        return $this->belongsTo(Tag::class);
    }

    public function timeSlots(): HasMany
    {
        return $this->hasMany(TimeSlot::class);
    }
}
