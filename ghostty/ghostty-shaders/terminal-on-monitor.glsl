// terminal-on-monitor.glsl — Ghostty shader
// Projects terminal content into a monitor region over a background image.
//
// HOW TO USE:
//   1. Add to your Ghostty config:
//        background-image = /path/to/your-photo.jpg
//        background-opacity = 1.0
//        custom-shader = ./ghostty-shaders/terminal-on-monitor.glsl
//
//   2. Size your Ghostty window to match the photo's aspect ratio
//   3. Keep terminal content in the SOURCE region (default: top-left 40% of window)
//      — type your code there, or just let it run
//   4. The shader will warp that content into the monitor region
//
// CALIBRATION:
//   Open the photo in an image editor. Note the 4 corners of the monitor screen
//   as pixel coordinates relative to the image. Update MONITOR_* below.
//
//   Example: 1920x1080 photo, monitor is centered, 600x400 pixels:
//     MONITOR_TL = vec2(660, 340)   // top-left
//     MONITOR_TR = vec2(1260, 340)  // top-right
//     MONITOR_BL = vec2(660, 740)   // bottom-left
//     MONITOR_BR = vec2(1260, 740)  // bottom-right

// ─── MONITOR CORNERS (pixel coords in the image) ───
// Replace these with the four corners of the monitor screen in YOUR photo
const vec2 MONITOR_TL = vec2(660.0, 340.0);
const vec2 MONITOR_TR = vec2(1260.0, 340.0);
const vec2 MONITOR_BL = vec2(660.0, 740.0);
const vec2 MONITOR_BR = vec2(1260.0, 740.0);

// ─── SOURCE REGION (where terminal content lives on screen) ───
// Normalized coordinates [0..1] of the area containing the terminal text
const vec2 SRC_ORIGIN = vec2(0.0, 0.0);     // top-left corner
const vec2 SRC_SIZE   = vec2(0.4, 0.4);      // width & height

// ─── VISUAL EFFECTS ───
const float CURVATURE  = 0.08;    // CRT barrel distortion
const float SCANLINES  = 0.10;    // scanline opacity
const float VIGNETTE   = 0.30;    // edge darkening
const float BRIGHTNESS = 1.0;     // terminal brightness in monitor
const float BORDER_W   = 4.0;     // monitor bezel width in pixels

// ─── PERSPECTIVE BILINEAR MAPPING ───
// Map a point in the unit square to the monitor quadrilateral
vec2 mapToMonitor(vec2 p) {
    vec2 top = mix(MONITOR_TL, MONITOR_TR, p.x);
    vec2 bot = mix(MONITOR_BL, MONITOR_BR, p.x);
    return mix(top, bot, p.y);
}

// Inverse: map a pixel coordinate back to unit-square UV
// Uses iterative approximation (Newton's method)
vec2 mapFromMonitor(vec2 pos) {
    vec2 uv = vec2(0.5);
    for (int i = 0; i < 8; i++) {
        vec2 top = mix(MONITOR_TL, MONITOR_TR, uv.x);
        vec2 bot = mix(MONITOR_BL, MONITOR_BR, uv.x);
        vec2 f = mix(top, bot, uv.y) - pos;

        vec2 dtop = MONITOR_TR - MONITOR_TL;
        vec2 dbot = MONITOR_BR - MONITOR_BL;
        vec2 dfdu = mix(dtop, dbot, uv.y);
        vec2 dfdv = bot - top;

        float det = dfdu.x * dfdv.y - dfdu.y * dfdv.x;
        if (abs(det) < 1e-10) break;
        uv -= vec2(
            (f.x * dfdv.y - f.y * dfdv.x) / det,
            (f.y * dfdu.x - f.x * dfdu.y) / det
        );
    }
    return clamp(uv, 0.0, 1.0);
}

// Rounded rectangle SDF for antialiasing
float sdRoundRect(vec2 p, vec2 size, float r) {
    vec2 d = abs(p) - size + vec2(r);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Get the original pixel (background image + whatever terminal was there)
    vec2 imgUV = fragCoord / iResolution.xy;
    vec4 original = texture(iChannel0, imgUV);

    // Check if this pixel is inside the monitor region
    vec2 monUV = mapFromMonitor(fragCoord);

    bool inside = all(greaterThanEqual(monUV, vec2(0.0))) &&
                  all(lessThanEqual(monUV, vec2(1.0)));

    if (!inside) {
        // Outside monitor — show original background image
        fragColor = original;
        return;
    }

    // Inside monitor — map terminal source into monitor with perspective
    // Source UV: where to sample terminal content from
    vec2 srcUV = SRC_ORIGIN + monUV * SRC_SIZE;
    vec4 term = texture(iChannel0, clamp(srcUV, 0.0, 1.0));

    // CRT barrel distortion effect on the monitor content
    vec2 center = monUV - 0.5;
    float r2 = dot(center, center);
    vec2 distortedUV = monUV + center * CURVATURE * r2;

    // Check if we're inside the curved monitor bounds
    bool inCurved = all(greaterThanEqual(distortedUV, vec2(0.0))) &&
                    all(lessThanEqual(distortedUV, vec2(1.0)));

    if (!inCurved) {
        fragColor = original;
        return;
    }

    // Resample terminal at curved UV
    vec2 curvedSrcUV = SRC_ORIGIN + distortedUV * SRC_SIZE;
    vec4 curvedTerm = texture(iChannel0, clamp(curvedSrcUV, 0.0, 1.0));

    // Scanlines
    float scan = 1.0 - SCANLINES * abs(sin(distortedUV.y * iResolution.y * 0.5));

    // Vignette
    float vig = 1.0 - VIGNETTE * length(distortedUV - 0.5) * 1.4;

    // Monitor bezel — dark border around the screen
    vec2 monCenter = (MONITOR_TL + MONITOR_TR + MONITOR_BL + MONITOR_BR) * 0.25;
    vec2 monSize = vec2(
        distance(MONITOR_TL, MONITOR_TR),
        distance(MONITOR_TL, MONITOR_BL)
    );
    vec2 localUV = (fragCoord - monCenter) / monSize;
    float bezel = 1.0 - smoothstep(0.48, 0.5, length(localUV));

    vec3 col = curvedTerm.rgb * scan * vig * BRIGHTNESS;
    col = mix(col, vec3(0.08, 0.08, 0.1), 1.0 - bezel);

    fragColor = vec4(col, 1.0);
}
