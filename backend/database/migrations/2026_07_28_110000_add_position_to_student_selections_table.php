<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Students now prioritize their picks by dragging them into order; position 0 is the top priority.
        Schema::table('student_selections', function (Blueprint $table) {
            $table->unsignedTinyInteger('position')->default(0)->after('topic_id');
        });
    }

    public function down(): void
    {
        Schema::table('student_selections', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }
};
