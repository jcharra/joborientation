<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tag extends Model
{
    protected $fillable = ['name', 'slug', 'description'];

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }

    public function studentPreferences(): HasMany
    {
        return $this->hasMany(StudentTagPreference::class);
    }
}
