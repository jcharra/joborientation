<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('slot_options', function (Blueprint $table) {
            $table->id();
            $table->string('kind'); // 'presentation' | 'reception'
            $table->string('start_time'); // 'H:i', e.g. '13:30'
            $table->string('end_time');   // 'H:i', e.g. '14:20'
            $table->timestamps();
        });

        // Seed the previously-hardcoded slot list as the starting selection —
        // the admin can now add/edit/remove from here.
        $now = now();
        DB::table('slot_options')->insert([
            ['kind' => 'presentation', 'start_time' => '13:30', 'end_time' => '14:20', 'created_at' => $now, 'updated_at' => $now],
            ['kind' => 'presentation', 'start_time' => '14:30', 'end_time' => '15:20', 'created_at' => $now, 'updated_at' => $now],
            ['kind' => 'presentation', 'start_time' => '15:30', 'end_time' => '16:20', 'created_at' => $now, 'updated_at' => $now],
            ['kind' => 'presentation', 'start_time' => '16:30', 'end_time' => '17:20', 'created_at' => $now, 'updated_at' => $now],
            ['kind' => 'reception',    'start_time' => '17:45', 'end_time' => '18:30', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('slot_options');
    }
};
