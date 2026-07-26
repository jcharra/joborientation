<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('app_settings')->where('key', 'event_title_de')->update(['value' => 'Forum der Berufe', 'updated_at' => now()]);
        DB::table('app_settings')->where('key', 'event_title_fr')->update(['value' => 'Forum des métiers', 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('app_settings')->where('key', 'event_title_de')->update(['value' => 'Berufsorientierung', 'updated_at' => now()]);
        DB::table('app_settings')->where('key', 'event_title_fr')->update(['value' => 'Orientation Professionnelle', 'updated_at' => now()]);
    }
};
