<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultant_profiles', function (Blueprint $table) {
            $table->string('first_name', 100)->nullable()->after('user_id');
            $table->string('last_name', 100)->nullable()->after('first_name');
            $table->string('phone', 30)->nullable()->after('last_name');
            $table->unsignedSmallInteger('graduation_year')->nullable()->after('phone');
            $table->string('serie', 10)->nullable()->after('graduation_year');
            $table->string('linkedin_url', 255)->nullable()->after('serie');
            $table->text('career_path')->nullable()->after('linkedin_url');
            $table->text('current_situation')->nullable()->after('career_path');
            $table->text('why_this_career')->nullable()->after('current_situation');
        });
    }

    public function down(): void
    {
        Schema::table('consultant_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'first_name', 'last_name', 'phone', 'graduation_year',
                'serie', 'linkedin_url', 'career_path', 'current_situation', 'why_this_career',
            ]);
        });
    }
};
