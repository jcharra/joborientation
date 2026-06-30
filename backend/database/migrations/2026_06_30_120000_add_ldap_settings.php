<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('app_settings')->insert([
            ['key' => 'ldap_students', 'value' => 'false', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'ldap_consultants', 'value' => 'false', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        DB::table('app_settings')->whereIn('key', ['ldap_students', 'ldap_consultants'])->delete();
    }
};
