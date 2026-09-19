// Newspaper quad on background.jpg. Origin top-left, y down.
const vec2 TL = vec2(0.464, 0.052);
const vec2 TR = vec2(0.812, 0.138);
const vec2 BR = vec2(0.750, 0.544);
const vec2 BL = vec2(0.408, 0.446);

vec2 invBilinear(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
    vec2 e = b - a;
    vec2 f = d - a;
    vec2 g = a - b + c - d;
    vec2 h = p - a;

    float k2 = g.x * f.y - g.y * f.x;
    float k1 = e.x * f.y - e.y * f.x + h.x * g.y - h.y * g.x;
    float k0 = h.x * e.y - h.y * e.x;

    if (abs(k2) < 1e-5) {
        float v = (abs(k1) < 1e-5) ? 0.0 : -k0 / k1;
        float u = (h.x - f.x * v) / (e.x + g.x * v + 1e-6);
        return vec2(u, v);
    }

    float w = k1 * k1 - 4.0 * k0 * k2;
    if (w < 0.0) return vec2(-1.0);
    w = sqrt(w);

    float v = (-k1 - w) / (2.0 * k2);
    float u = (h.x - f.x * v) / (e.x + g.x * v + 1e-6);
    if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) {
        v = (-k1 + w) / (2.0 * k2);
        u = (h.x - f.x * v) / (e.x + g.x * v + 1e-6);
    }
    return vec2(u, v);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 st = invBilinear(uv, TL, TR, BR, BL);

    if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) {
        fragColor = texture(iChannel0, uv);
        return;
    }

    fragColor = texture(iChannel0, st);
}
