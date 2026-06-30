<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Students pick up to 6 tags in priority order; 4 get assigned.
        Schema::create('student_tag_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('priority'); // 1 = most preferred
            $table->boolean('is_assigned')->default(false);
            $table->timestamps();

            $table->unique(['student_id', 'tag_id']);
            $table->unique(['student_id', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_tag_preferences');
    }
};
