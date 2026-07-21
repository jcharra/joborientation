<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            // Admins assign tags; consultants save topics without one initially
            $table->foreignId('tag_id')->nullable()->change();
            $table->json('selected_slots')->nullable()->after('tag_id');
        });
    }

    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropColumn('selected_slots');
            $table->foreignId('tag_id')->nullable(false)->change();
        });
    }
};
