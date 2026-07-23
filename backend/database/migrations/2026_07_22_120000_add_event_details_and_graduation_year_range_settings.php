<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('app_settings')->insert([
            ['key' => 'event_datetime', 'value' => null, 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'event_location', 'value' => null, 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'graduation_year_min', 'value' => '1990', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'graduation_year_max', 'value' => '2050', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        DB::table('app_settings')->whereIn('key', [
            'event_datetime',
            'event_location',
            'graduation_year_min',
            'graduation_year_max',
        ])->delete();
    }
};
