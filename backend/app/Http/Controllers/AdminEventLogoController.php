<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class AdminEventLogoController extends Controller
{
    private const FAVICON_SIZE = 64;

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('logo');
        $path = $file->store('event-logo', 'public');

        $faviconPath = $this->generateFavicon($file, $path);

        AppSetting::set('event_logo_path', $path);
        AppSetting::set('event_favicon_path', $faviconPath);

        return response()->json([
            'event_logo_url' => '/storage/' . $path,
            'event_favicon_url' => '/storage/' . $faviconPath . '?v=' . Storage::disk('public')->lastModified($faviconPath),
        ]);
    }

    public function destroy(): JsonResponse
    {
        AppSetting::set('event_logo_path', null);
        AppSetting::set('event_favicon_path', null);

        return response()->json(['event_logo_url' => null, 'event_favicon_url' => null]);
    }

    /**
     * Renders a small square favicon from the uploaded logo. If GD can't decode the
     * source (e.g. a format GD wasn't compiled with support for), the original logo
     * is used unresized rather than failing the whole upload.
     */
    private function generateFavicon(UploadedFile $file, string $originalPath): string
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        if ($source === false) {
            return $originalPath;
        }

        $size = self::FAVICON_SIZE;
        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min($size / $width, $size / $height);
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $canvas = imagecreatetruecolor($size, $size);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);

        imagecopyresampled(
            $canvas,
            $source,
            (int) (($size - $newWidth) / 2),
            (int) (($size - $newHeight) / 2),
            0,
            0,
            $newWidth,
            $newHeight,
            $width,
            $height,
        );

        ob_start();
        imagepng($canvas);
        $contents = ob_get_clean();

        $faviconPath = 'event-logo/favicon.png';
        Storage::disk('public')->put($faviconPath, $contents);

        return $faviconPath;
    }
}
