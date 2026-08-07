// monitor-warp.glsl — Ghostty shader
// Warps terminal content into a perspective monitor shape with CRT effect
// Useful as a source for compositing onto photos of a person at a computer
//
// Tuning:
//   PERSPECTIVE — tilt amount (0=none, 0.3=subtle, 0.6=pronounced)
//   MONITOR_ASPECT — width/height ratio of the target monitor in your image
//   SCANLINE_STRENGTH — 0.0 to 1.0
//   CURVATURE — CRT barrel distortion (0=flat, 0.15=typical CRT)

const float PERSPECTIVE = 0.35;
const float MONITOR_ASPECT = 1.6;   // e.g. 16:10 = 1.6
const float SCANLINE_STRENGTH = 0.12;
const float CURVATURE = 0.10;
const float ROUNDED_CORNERS = 0.04;
const float BORDER_WIDTH = 0.015;
const vec3 BORDER_COLOR = vec3(0.12, 0.12, 0.14);

// 2D rotation
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Signed-distance rounded rectangle
float sdRoundedRect(vec2 p, vec2 size, float r) {
    vec2 d = abs(p) - size + vec2(r);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized coords, centered
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 suv = uv;

    // --- Perspective transform (vertical tilt) ---
    // Stretch at the top, compress at the bottom
    float tilt = PERSPECTIVE;
    float yScale = 1.0 - uv.y * tilt;
    vec2 puv = uv;
    puv.x = uv.x / yScale;
    puv.y = (uv.y - 0.15 * tilt * uv.x * uv.x) / (1.0 + tilt * 0.5);

    // --- Clamp to monitor viewport ---
    float aspect = MONITOR_ASPECT * (iResolution.x / iResolution.y);
    vec2 monitorSize = vec2(aspect * 0.45, 0.45);
    vec2 muv = puv / monitorSize;

    // CRT-style barrel distortion
    vec2 dc = muv;
    float r2 = dot(dc, dc);
    muv = dc * (1.0 + CURVATURE * r2);

    vec4 result;

    // Check if we're inside the monitor bounds
    float borderW = BORDER_WIDTH / monitorSize.x;
    float cornerR = ROUNDED_CORNERS;
    float dContent = sdRoundedRect(muv, vec2(1.0 - borderW), cornerR);
    float dBorder  = sdRoundedRect(muv, vec2(1.0), cornerR + borderW * 0.5);

    if (dBorder > 0.0) {
        // Outside monitor — transparent
        result = vec4(0.0);
    } else {
        // Sample terminal content with perspective warp
        vec2 sampleUV = muv * 0.5 + 0.5;
        vec4 termColor = texture(iChannel0, clamp(sampleUV, 0.001, 0.999));

        // Border region
        float borderMix = smoothstep(0.0, 0.002, dContent);
        vec3 col = mix(BORDER_COLOR, termColor.rgb, 1.0 - borderMix);

        // Scanlines
        float scanline = 1.0 - SCANLINE_STRENGTH * abs(sin(muv.y * iResolution.y * 0.5));
        col *= scanline;

        // Vignette
        float vignette = 1.0 - 0.4 * length(muv);
        col *= vignette;

        result = vec4(col, 1.0);
    }

    fragColor = result;
}
