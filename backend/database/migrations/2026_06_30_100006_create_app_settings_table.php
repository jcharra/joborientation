<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Key-value store for runtime configuration (e.g. current_phase: selection|conference)
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        DB::table('app_settings')->insert([
            ['key' => 'current_phase', 'value' => 'selection', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'max_tag_choices', 'value' => '6', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'assigned_tags_count', 'value' => '4', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
