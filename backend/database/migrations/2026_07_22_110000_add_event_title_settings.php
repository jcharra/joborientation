<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('app_settings')->insert([
            ['key' => 'event_title_en', 'value' => 'Job Orientation', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'event_title_de', 'value' => 'Berufsorientierung', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'event_title_fr', 'value' => 'Orientation Professionnelle', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        DB::table('app_settings')->whereIn('key', ['event_title_en', 'event_title_de', 'event_title_fr'])->delete();
    }
};
