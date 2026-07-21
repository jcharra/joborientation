<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultant_profiles', function (Blueprint $table) {
            $table->boolean('consent_poster')->default(false)->after('why_this_career');
            $table->boolean('consent_alumni_data')->default(false)->after('consent_poster');
        });
    }

    public function down(): void
    {
        Schema::table('consultant_profiles', function (Blueprint $table) {
            $table->dropColumn(['consent_poster', 'consent_alumni_data']);
        });
    }
};
