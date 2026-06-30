<?php

use App\Http\Controllers\Auth\ConsultantLoginController;
use App\Http\Controllers\Auth\StudentLoginController;
use Illuminate\Support\Facades\Route;

// Consultant auth (email + password)
Route::prefix('auth/consultant')->group(function () {
    Route::post('login', [ConsultantLoginController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [ConsultantLoginController::class, 'logout']);
        Route::get('me', [ConsultantLoginController::class, 'me']);
    });
});

// Student auth (LDAP)
Route::prefix('auth/student')->group(function () {
    Route::post('login', [StudentLoginController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [StudentLoginController::class, 'logout']);
        Route::get('me', [StudentLoginController::class, 'me']);
    });
});
