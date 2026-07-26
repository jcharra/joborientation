<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;

class AppConfigController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'ldap_consultants' => AppSetting::getBool('ldap_consultants'),
            'current_phase' => AppSetting::currentPhase(),
            'max_tag_choices' => (int) AppSetting::get('max_tag_choices', 6),
            'assigned_tags_count' => (int) AppSetting::get('assigned_tags_count', 4),
            'admin_email' => AppSetting::get('admin_email', 'admin@example.com'),
            'event_title' => [
                'de' => AppSetting::get('event_title_de', 'Forum der Berufe'),
                'fr' => AppSetting::get('event_title_fr', 'Forum des métiers'),
            ],
            'event_datetime' => AppSetting::get('event_datetime'),
            'event_location' => AppSetting::get('event_location'),
            'graduation_year_range' => [
                'min' => (int) AppSetting::get('graduation_year_min', 1990),
                'max' => AppSetting::graduationYearMax(),
            ],
        ]);
    }
}
