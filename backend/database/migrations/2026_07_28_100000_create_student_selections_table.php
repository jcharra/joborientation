<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A student directly picks 4–6 talks (topics) to attend during the selection phase.
        Schema::create('student_selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('topic_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'topic_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_selections');
    }
};
