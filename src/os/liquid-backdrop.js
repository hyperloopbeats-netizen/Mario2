// Black Liquid OS — Animated WebGL Obsidian Ferrofluid Backdrop
export function initLiquidBackdrop(canvas) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });

  if (!gl) {
    canvas.style.background = 'radial-gradient(circle at 30% 25%, #161b26 0%, #06080d 65%, #020305 100%)';
    return { destroy: () => {} };
  }

  const vsSource = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.02;
        a *= 0.5;
      }
      return v;
    }

    float liquidHeight(vec2 uv, float t, vec2 m) {
      float dist = length(uv - m);
      float ripple = sin(dist * 10.0 - t * 2.2) * exp(-dist * 2.6) * 0.14;
      vec2 q = vec2(fbm(uv * 1.6 + t * 0.08), fbm(uv * 1.6 + vec2(5.2, 1.3) - t * 0.06));
      float flow = fbm(uv * 2.1 + q * 1.5 + t * 0.05);
      return flow + ripple;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
      vec2 m = (u_mouse - 0.5 * u_res) / min(u_res.x, u_res.y);
      float t = u_time;

      float e = 0.012;
      float h = liquidHeight(uv, t, m);
      float hx = liquidHeight(uv + vec2(e, 0.0), t, m);
      float hy = liquidHeight(uv + vec2(0.0, e), t, m);

      vec3 normal = normalize(vec3((h - hx) / e * 0.35, (h - hy) / e * 0.35, 1.0));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      vec3 lightDir1 = normalize(vec3(0.5, 0.7, 0.9));
      vec3 lightDir2 = normalize(vec3(-0.7, -0.3, 0.6));

      float diff1 = max(dot(normal, lightDir1), 0.0);
      vec3 half1 = normalize(lightDir1 + viewDir);
      float spec1 = pow(max(dot(normal, half1), 0.0), 42.0);

      vec3 half2 = normalize(lightDir2 + viewDir);
      float spec2 = pow(max(dot(normal, half2), 0.0), 28.0);

      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

      // Deep black liquid obsidian base with subtle mercury/steel specular glints
      vec3 base = vec3(0.014, 0.018, 0.026);
      vec3 mid = vec3(0.045, 0.058, 0.082) * diff1;
      vec3 glint1 = vec3(0.32, 0.42, 0.56) * spec1 * 0.55;
      vec3 glint2 = vec3(0.18, 0.24, 0.34) * spec2 * 0.35;
      vec3 rim = vec3(0.12, 0.16, 0.22) * fresnel * 0.4;

      float vignette = 1.0 - smoothstep(0.45, 1.35, length(uv));
      vec3 col = (base + mid + glint1 + glint2 + rim) * (0.45 + 0.55 * vignette);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  let mouseX = window.innerWidth * 0.5;
  let mouseY = window.innerHeight * 0.5;
  let targetMouseX = mouseX;
  let targetMouseY = mouseY;

  const onPointerMove = (e) => {
    targetMouseX = e.clientX;
    targetMouseY = window.innerHeight - e.clientY;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  function resize() {
    const scale = 0.5; // Low-res smooth liquid shader keeps CPU/GPU overhead near zero
    canvas.width = Math.max(2, Math.floor(window.innerWidth * scale));
    canvas.height = Math.max(2, Math.floor(window.innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  let rafId = 0;
  let lastDraw = 0;
  const startTime = performance.now();

  function render(now) {
    rafId = requestAnimationFrame(render);
    if (prefersReduced && lastDraw > 0) return;
    if (now - lastDraw < 33) return; // ~30fps liquid background leaves full 60fps budget for Mario 2D/3D
    lastDraw = now;

    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    const t = prefersReduced ? 1.0 : (now - startTime) * 0.001;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouseX * 0.5, mouseY * 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  rafId = requestAnimationFrame(render);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
    }
  };
}
