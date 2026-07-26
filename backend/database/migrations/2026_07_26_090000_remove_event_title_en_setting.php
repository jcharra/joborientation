<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('app_settings')->where('key', 'event_title_en')->delete();
    }

    public function down(): void
    {
        DB::table('app_settings')->insert([
            'key' => 'event_title_en',
            'value' => 'Job Orientation',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
