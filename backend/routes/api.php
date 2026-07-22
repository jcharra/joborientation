<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminInviteController;
use App\Http\Controllers\AdminPhaseController;
use App\Http\Controllers\Auth\AcceptInvitationController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\ResendVerificationController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\AppConfigController;
use App\Http\Controllers\Auth\ConsultantLoginController;
use App\Http\Controllers\Auth\StudentLoginController;
use App\Http\Controllers\ConsultantProfileController;
use App\Http\Controllers\ConsultantSessionController;
use App\Http\Middleware\RequireAdmin;
use Illuminate\Support\Facades\Route;

// Public app configuration (LDAP flags, phase, limits)
Route::get('config', [AppConfigController::class, 'show']);

// Registration and email verification
Route::post('auth/register', [RegisterController::class, 'register']);
Route::post('auth/invitation/accept', [AcceptInvitationController::class, 'accept']);
Route::get('auth/email/verify/{id}/{hash}', [VerifyEmailController::class, 'verify'])->name('verification.verify');
Route::post('auth/email/resend', [ResendVerificationController::class, 'resend']);

// Consultant auth (email + password, or LDAP when ldap_consultants=true)
Route::prefix('auth/consultant')->group(function () {
    Route::post('login', [ConsultantLoginController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [ConsultantLoginController::class, 'logout']);
        Route::get('me', [ConsultantLoginController::class, 'me']);
    });
});

// Consultant profile (view + update, including photo upload)
Route::prefix('consultant')->middleware('auth:sanctum')->group(function () {
    Route::get('profile', [ConsultantProfileController::class, 'show']);
    Route::post('profile', [ConsultantProfileController::class, 'update']);
    Route::get('session', [ConsultantSessionController::class, 'show']);
    Route::post('session', [ConsultantSessionController::class, 'update']);
});

// Admin-only endpoints
Route::prefix('admin')->middleware(['auth:sanctum', RequireAdmin::class])->group(function () {
    Route::get('students', [AdminController::class, 'students']);
    Route::get('consultants', [AdminController::class, 'consultants']);
    Route::get('consultants/{id}', [AdminController::class, 'consultant']);
    Route::get('topics', [AdminController::class, 'topics']);
    Route::post('phase', [AdminPhaseController::class, 'update']);
    Route::post('invite', [AdminInviteController::class, 'invite']);
});

// Student auth (LDAP when ldap_students=true, otherwise email + password)
Route::prefix('auth/student')->group(function () {
    Route::post('login', [StudentLoginController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [StudentLoginController::class, 'logout']);
        Route::get('me', [StudentLoginController::class, 'me']);
    });
});
