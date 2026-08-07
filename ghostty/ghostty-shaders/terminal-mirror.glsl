// terminal-mirror.glsl — Ghostty shader
// Mirrors terminal content into a perspective-warped quadrilateral region.
// No additional effects — just a clean projection onto the monitor in your image.
//
// CALIBRATION:
//   Open your background image in an image editor.
//   Find the pixel coordinates of the 4 corners of the monitor screen in your image.
//   Update MONITOR_* below with those values.
//
//   The terminal content that appears inside the monitor is taken from the
//   SRC_* region (default: the entire terminal area). Adjust SRC_* if you
//   want to only mirror a portion of the terminal.

// ─── MONITOR CORNERS (pixel coords in your 1024×1024 image) ───
//   Replace these with the four corners of the monitor screen.
//   The order: TL, TR, BL, BR = top-left, top-right, bottom-left, bottom-right
const vec2 MONITOR_TL = vec2(100.0, 200.0);
const vec2 MONITOR_TR = vec2(500.0, 180.0);
const vec2 MONITOR_BL = vec2(120.0, 600.0);
const vec2 MONITOR_BR = vec2(520.0, 580.0);

// ─── SOURCE REGION (which part of the terminal to mirror) ───
//   Normalized coordinates [0..1]. Default = entire terminal.
//   Set to e.g. vec2(0.0, 0.0) / vec2(0.5, 0.5) to only mirror top-left quadrant.
const vec2 SRC_ORIGIN = vec2(0.0, 0.0);
const vec2 SRC_SIZE   = vec2(1.0, 1.0);

// ─── INVERSE BILINEAR MAPPING ───
// Maps a pixel coordinate back to the unit square [0,1]²
// using iterative Newton's method.

vec2 invBilinear(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
    vec2 uv = vec2(0.5);
    for (int i = 0; i < 12; i++) {
        vec2 top = mix(a, b, uv.x);
        vec2 bot = mix(d, c, uv.x);
        vec2 f = mix(top, bot, uv.y) - p;

        vec2 dtop = b - a;
        vec2 dbot = c - d;
        vec2 dfdu = mix(dtop, dbot, uv.y);
        vec2 dfdv = bot - top;

        float det = dfdu.x * dfdv.y - dfdu.y * dfdv.x;
        if (abs(det) < 1e-12) break;
        uv -= vec2(
            (f.x * dfdv.y - f.y * dfdv.x) / det,
            (f.y * dfdu.x - f.x * dfdu.y) / det
        );
    }
    return uv;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Original pixel from the composited frame (background image + terminal)
    vec2 imgUV = fragCoord / iResolution.xy;
    vec4 original = texture(iChannel0, imgUV);

    // Map this pixel to the unit square of the monitor quadrilateral
    vec2 monUV = invBilinear(
        fragCoord,
        MONITOR_TL, MONITOR_TR,
        MONITOR_BR, MONITOR_BL
    );

    // If we're inside the monitor, sample from the terminal source region
    bool inside = all(greaterThanEqual(monUV, vec2(0.0))) &&
                  all(lessThanEqual(monUV, vec2(1.0)));

    if (inside) {
        vec2 srcUV = SRC_ORIGIN + monUV * SRC_SIZE;
        fragColor = texture(iChannel0, clamp(srcUV, 0.0, 1.0));
    } else {
        fragColor = original;
    }
}
