vec4 TRAIL_COLOR = iCurrentCursorColor;

const float DURATION = 0.2;
const float TRAIL_SIZE = 0.8;
const float THRESHOLD_MIN_DISTANCE = 1.5;
const float BLUR = 1.0;
const float TRAIL_THICKNESS = 1.0;
const float TRAIL_THICKNESS_X = 0.9;

const float FADE_ENABLED = 0.0;
const float FADE_EXPONENT = 5.0;

float ease(float x) {
    return sqrt(1.0 - pow(x - 1.0, 2.0));
}

vec2 normalize(vec2 value, float isPosition) {
    return (value * 2.0 - (iResolution.xy * isPosition)) / iResolution.y;
}

float antialias(float d, float blur) {
    return 1.0 - smoothstep(0.0, normalize(vec2(blur), 0.0).x, d);
}

float getSdfRectangle(vec2 p, vec2 c, vec2 b) {
    vec2 d = abs(p - c) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Convex quad SDF
float seg(vec2 p, vec2 a, vec2 b, inout float s, float d) {
    vec2 e = b - a;
    vec2 w = p - a;
    vec2 proj = a + e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(p - proj, p - proj));

    float c0 = step(0.0, p.y - a.y);
    float c1 = 1.0 - step(0.0, p.y - b.y);
    float c2 = 1.0 - step(0.0, e.x * w.y - e.y * w.x);
    float flip = mix(1.0, -1.0, step(0.5, c0 * c1 * c2 + (1.0 - c0) * (1.0 - c1) * (1.0 - c2)));
    s *= flip;

    return d;
}

float sdfQuad(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d_) {
    float s = 1.0;
    float d = dot(p - a, p - a);
    d = seg(p, a, b, s, d);
    d = seg(p, b, c, s, d);
    d = seg(p, c, d_, s, d);
    d = seg(p, d_, a, s, d);
    return s * sqrt(d);
}

float getDuration(float dotVal, float lead, float side, float trail) {
    float isLead = step(0.5, dotVal);
    float isSide = step(-0.5, dotVal) * (1.0 - isLead);
    float d = mix(trail, side, isSide);
    return mix(d, lead, isLead);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #if !defined(WEB)
    fragColor = texture(iChannel0, fragCoord.xy / iResolution.xy);
    #endif

    vec2 uv = normalize(fragCoord, 1.0);
    vec2 offset = vec2(-0.5, 0.5);

    vec4 cc = vec4(normalize(iCurrentCursor.xy,1.0), normalize(iCurrentCursor.zw,0.0));
    vec4 cp = vec4(normalize(iPreviousCursor.xy,1.0), normalize(iPreviousCursor.zw,0.0));

    vec2 ccC = cc.xy - cc.zw * offset;
    vec2 cpC = cp.xy - cp.zw * offset;

    float sdfCursor = getSdfRectangle(uv, ccC, cc.zw * 0.5);

    float dist = distance(ccC, cpC);
    float minDist = cc.w * THRESHOLD_MIN_DISTANCE;
    float t = iTime - iTimeCursorChange;

    vec4 col = fragColor;

    if (dist > minDist && t < DURATION) {

        // Resize helper
        vec2 scale = vec2(TRAIL_THICKNESS_X, TRAIL_THICKNESS) * 0.5;

        vec2 ccHalf = cc.zw * scale;
        vec2 cpHalf = cp.zw * scale;

        vec2 ccTL = ccC + vec2(-ccHalf.x,  ccHalf.y);
        vec2 ccTR = ccC + vec2( ccHalf.x,  ccHalf.y);
        vec2 ccBL = ccC + vec2(-ccHalf.x, -ccHalf.y);
        vec2 ccBR = ccC + vec2( ccHalf.x, -ccHalf.y);

        vec2 cpTL = cpC + vec2(-cpHalf.x,  cpHalf.y);
        vec2 cpTR = cpC + vec2( cpHalf.x,  cpHalf.y);
        vec2 cpBL = cpC + vec2(-cpHalf.x, -cpHalf.y);
        vec2 cpBR = cpC + vec2( cpHalf.x, -cpHalf.y);

        vec2 move = ccC - cpC;
        vec2 s = sign(move);

        float lead = DURATION * (1.0 - TRAIL_SIZE);
        float trail = DURATION;
        float side = (lead + trail) * 0.5;

        float dTL = getDuration(dot(vec2(-1, 1), s), lead, side, trail);
        float dTR = getDuration(dot(vec2( 1, 1), s), lead, side, trail);
        float dBL = getDuration(dot(vec2(-1,-1), s), lead, side, trail);
        float dBR = getDuration(dot(vec2( 1,-1), s), lead, side, trail);

        vec2 vTL = mix(cpTL, ccTL, ease(clamp(t / dTL, 0.0, 1.0)));
        vec2 vTR = mix(cpTR, ccTR, ease(clamp(t / dTR, 0.0, 1.0)));
        vec2 vBL = mix(cpBL, ccBL, ease(clamp(t / dBL, 0.0, 1.0)));
        vec2 vBR = mix(cpBR, ccBR, ease(clamp(t / dBR, 0.0, 1.0)));

        float sdfTrail = sdfQuad(uv, vTL, vTR, vBR, vBL);

        float blur = (BLUR < 2.5) ? BLUR * abs(s.x * s.y) : BLUR;
        float alpha = antialias(sdfTrail, blur);

        vec4 trailCol = TRAIL_COLOR;

        if (FADE_ENABLED > 0.5) {
            float f = clamp(dot(uv - cpC, move) / (dot(move, move) + 1e-6), 0.0, 1.0);
            trailCol.a *= pow(f, FADE_EXPONENT);
        }

        col = mix(col, vec4(trailCol.rgb, col.a), trailCol.a * alpha);
        col = mix(col, fragColor, step(sdfCursor, 0.0));
    }

    fragColor = col;
}
