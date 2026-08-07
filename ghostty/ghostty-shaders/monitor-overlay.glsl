// monitor-overlay.glsl — Ghostty shader
// Renders terminal content warped into a monitor shape, with transparent
// background outside the monitor. Perfect for compositing onto photos.
//
// Usage:
//   1. Add to Ghostty config: custom-shader = ./ghostty-shaders/monitor-overlay.glsl
//   2. Take a screenshot of the terminal window (cmd+shift+4, space, click window)
//   3. Composite onto your photo using FFmpeg/image editor
//
// For video, capture with OBS → apply perspective transform filter → overlay on image

const float PERSPECTIVE = 0.30;     // Vertical tilt (0=none, 0.5=extreme)
const float CURVATURE = 0.08;       // Barrel distortion (CRT curve)
const float ASPECT = 1.6;           // Target monitor aspect ratio (width/height)
const float CORNER_RADIUS = 0.03;   // Rounded corners
const float SCANLINES = 0.10;       // Scanline opacity
const float VIGNETTE = 0.3;         // Darken edges

// Rounded rectangle SDF
float sdRoundRect(vec2 p, vec2 size, float r) {
    vec2 d = abs(p) - size + vec2(r);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Perspective tilt: stretch top, compress bottom
    float yOff = uv.y * PERSPECTIVE;
    vec2 puv = vec2(uv.x / (1.0 - yOff), uv.y / (1.0 + PERSPECTIVE * 0.3));

    // Map to monitor space
    float aspect = ASPECT * (iResolution.x / iResolution.y);
    vec2 monSize = vec2(aspect * 0.45, 0.45);
    vec2 muv = puv / monSize;

    // CRT barrel distortion
    float r2 = dot(muv, muv);
    muv = muv * (1.0 + CURVATURE * r2);

    float d = sdRoundRect(muv, vec2(1.0), CORNER_RADIUS);
    if (d > 0.0) {
        // Outside monitor → fully transparent
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // Sample terminal content
    vec2 sampleUV = muv * 0.5 + 0.5;
    vec4 term = texture(iChannel0, clamp(sampleUV, 0.0, 1.0));

    // Scanlines
    float scan = 1.0 - SCANLINES * abs(sin(muv.y * iResolution.y * 0.5));

    // Vignette
    float vig = 1.0 - VIGNETTE * length(muv * 0.7);

    vec3 col = term.rgb * scan * vig;
    fragColor = vec4(col, 1.0);
}
