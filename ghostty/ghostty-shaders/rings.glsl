void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    uv -= 0.5;
    uv.x *= iResolution.x / iResolution.y;

    float r = length(uv);
    float angle = atan(uv.y, uv.x);

    float waves = sin(10.0 * r - iTime * 2.0);
    float glow = 0.1 / abs(waves);

    vec3 color = vec3(
        0.5 + 0.5 * sin(iTime + angle),
        0.5 + 0.5 * sin(iTime + angle + 2.0),
        0.5 + 0.5 * sin(iTime + angle + 4.0)
    );

    fragColor = vec4(color * glow, 1.0);
    }
