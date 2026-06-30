<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentTagPreference extends Model
{
    protected $fillable = ['student_id', 'tag_id', 'priority', 'is_assigned'];

    protected function casts(): array
    {
        return [
            'is_assigned' => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function tag(): BelongsTo
    {
        return $this->belongsTo(Tag::class);
    }
}
