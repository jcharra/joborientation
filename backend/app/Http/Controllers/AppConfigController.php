<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;

class AppConfigController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'ldap_students' => AppSetting::getBool('ldap_students'),
            'ldap_consultants' => AppSetting::getBool('ldap_consultants'),
            'current_phase' => AppSetting::currentPhase(),
            'max_tag_choices' => (int) AppSetting::get('max_tag_choices', 6),
            'assigned_tags_count' => (int) AppSetting::get('assigned_tags_count', 4),
            'admin_email' => AppSetting::get('admin_email', 'admin@example.com'),
            'event_title' => [
                'en' => AppSetting::get('event_title_en', 'Job Orientation'),
                'de' => AppSetting::get('event_title_de', 'Berufsorientierung'),
                'fr' => AppSetting::get('event_title_fr', 'Orientation Professionnelle'),
            ],
        ]);
    }
}
