"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type LoginBackgroundProps = {
  variant?: "default" | "gothic";
  performance?: "full" | "lite";
};

const PALETTES = {
  default: {
    base: [0.6353, 0.9608, 0.8588] as const,
    bg: [0, 0, 0] as const,
  },
  gothic: {
    base: [0.659, 0.333, 0.969] as const,
    bg: [0.039, 0.024, 0.071] as const,
  },
};

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const LITE_FRAGMENT_SHADER = `
  uniform vec2 r;
  uniform float t;
  uniform vec2 mouse;
  uniform vec3 baseColor;
  uniform vec3 bgColor;
  varying vec2 vUv;

  float wave(vec2 p, float phase, float freq) {
    return sin(p.x * freq + phase) * 0.28 * sin(p.y * freq * 0.5 + phase * 0.7);
  }

  float glowLine(float dist, float thickness, float intensity) {
    return intensity * thickness / (abs(dist) + thickness * 0.5);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= r.x / r.y;
    vec3 col = bgColor;
    float time = t * 0.35;

    vec2 mouseUv = (mouse - 0.5) * 2.0;
    mouseUv.x *= r.x / r.y;
    float mouseDist = length(uv - mouseUv);
    float mouseGlow = 0.08 / (mouseDist + 0.18);
    col += mouseGlow * baseColor * 0.22;

    float c1 = sin(time * 0.3) * 0.5 + 0.5;
    float c2 = sin(time * 0.3 + 2.2) * 0.5 + 0.5;

    float y1 = uv.y - wave(uv, time * 1.4, 2.0);
    col += baseColor * glowLine(y1, 0.035, 0.75) * (0.75 + 0.3 * c1);

    float y2 = uv.y + 0.35 - wave(uv + vec2(0.8, 0.4), time * 1.1, 2.2);
    col += baseColor * glowLine(y2, 0.035, 0.7) * (0.7 + 0.35 * c2);

    float dist = length(uv);
    float vignette = smoothstep(0.0, 1.0, 1.0 - dist * 0.45);
    col *= vignette;
    col = pow(col, vec3(0.96));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FULL_FRAGMENT_SHADER = `
  uniform vec2 r;
  uniform float t;
  uniform vec2 mouse;
  uniform vec3 baseColor;
  uniform vec3 bgColor;
  varying vec2 vUv;

  mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  float wave(vec2 p, float phase, float freq) {
    return sin(p.x * freq + phase) * 0.3 * sin(p.y * freq * 0.5 + phase * 0.7);
  }

  float glowLine(float dist, float thickness, float intensity) {
    return intensity * thickness / (abs(dist) + thickness * 0.5);
  }

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= (1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h));
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float starfield(vec2 uv, float time) {
    vec2 grid = floor(uv * 150.0);
    vec2 frac = fract(uv * 150.0) - 0.5;
    float star = hash(grid);
    if (star < 0.985) return 0.0;
    float twinkle = sin(time * 2.0 + grid.x + grid.y) * 0.5 + 0.5;
    float dist = length(frac);
    return smoothstep(0.08, 0.0, dist) * twinkle * (star - 0.985) * 100.0;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= r.x / r.y;
    vec2 uv0 = uv;
    vec3 col = bgColor;
    float time = t * 0.4;
    float noise = (snoise(uv * 0.5 + time * 0.02) + 1.0) * 0.5;
    col += noise * baseColor * 0.08;
    vec2 mouse_uv = (mouse - 0.5) * 2.0;
    mouse_uv.x *= r.x / r.y;
    float mouseDist = length(uv - mouse_uv);
    uv += (mouse_uv - uv) * (0.3 / (mouseDist + 0.5));
    float mouseGlow = 0.1 / (mouseDist + 0.1);
    mouseGlow *= (sin(t * 1.5) * 0.5 + 0.5) * 0.7 + 0.3;
    col += mouseGlow * baseColor * 0.2;
    uv *= rot(time * 0.05);
    float waveNoise = snoise(uv * 2.0 + time * 0.2) * 0.1;
    float c1 = sin(time * 0.3) * 0.5 + 0.5;
    float c2 = sin(time * 0.3 + 2.0) * 0.5 + 0.5;
    float c3 = sin(time * 0.3 + 4.0) * 0.5 + 0.5;
    col += baseColor * glowLine(uv.y - wave(uv, time * 1.5, 2.0) + waveNoise, 0.03, 0.8) * (0.75 + 0.35 * c1);
    col += baseColor * glowLine(uv.y + 0.4 - wave(uv + vec2(1.0, 0.5), time * 1.2, 2.5) + waveNoise * 0.8, 0.03, 0.8) * (0.7 + 0.4 * c2);
    col += baseColor * glowLine(uv.y - 0.4 - wave(uv + vec2(-0.5, 1.0), time * 1.8, 1.8) + waveNoise * 1.2, 0.03, 0.8) * (0.65 + 0.45 * c3);
    float dist = length(uv0);
    col += baseColor * abs(sin(dist * 4.0 - time * 2.0)) * exp(-dist * 0.5) * 0.28;
    col += starfield(uv0 * 2.0 + time * 0.01, t) * baseColor * 0.65;
    col += exp(-dist * 1.0) * 0.3 * baseColor * 0.75;
    col *= smoothstep(0.0, 1.0, 1.0 - dist * 0.5);
    gl_FragColor = vec4(pow(col, vec3(0.95)), 1.0);
  }
`;

export default function LoginBackground({
  variant = "default",
  performance = "full",
}: LoginBackgroundProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const palette = PALETTES[variant];
    const isLite = performance === "lite";
    let scene: THREE.Scene;
    let camera: THREE.OrthographicCamera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;
    let clock: THREE.Clock;
    const mouse = new THREE.Vector2(0.5, 0.5);
    const targetMouse = new THREE.Vector2(0.5, 0.5);
    let pointerActive = false;
    let pointerIdleTimer = 0;
    const uniforms = {
      t: { value: 0.0 },
      r: { value: new THREE.Vector2(1, 1) },
      mouse: { value: new THREE.Vector2(0.5, 0.5) },
      baseColor: { value: new THREE.Vector3(...palette.base) },
      bgColor: { value: new THREE.Vector3(...palette.bg) },
    };

    const maxPixelRatio = isLite ? 1 : Math.min(window.devicePixelRatio, 1.25);
    const frameIntervalMs = isLite ? 33 : 0;

    function init() {
      scene = new THREE.Scene();
      clock = new THREE.Clock();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      renderer = new THREE.WebGLRenderer({
        antialias: !isLite && window.devicePixelRatio <= 1.5,
        alpha: false,
        powerPreference: "high-performance",
      });
      const mountEl = mountRef.current;
      const width = mountEl?.clientWidth ?? window.innerWidth;
      const height = mountEl?.clientHeight ?? window.innerHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(maxPixelRatio);
      uniforms.r.value.set(width, height);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.zIndex = "0";
      mountRef.current?.appendChild(renderer.domElement);
      const geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX_SHADER,
        fragmentShader: isLite ? LITE_FRAGMENT_SHADER : FULL_FRAGMENT_SHADER,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("resize", onWindowResize);
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    function syncMouseFromClient(clientX: number, clientY: number) {
      targetMouse.x = clientX / window.innerWidth;
      targetMouse.y = 1.0 - clientY / window.innerHeight;
      mouse.copy(targetMouse);
    }

    function onPointerMove(event: PointerEvent) {
      pointerActive = true;
      window.clearTimeout(pointerIdleTimer);
      pointerIdleTimer = window.setTimeout(() => {
        pointerActive = false;
      }, 160);
      syncMouseFromClient(event.clientX, event.clientY);
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length > 0) {
        pointerActive = true;
        syncMouseFromClient(event.touches[0].clientX, event.touches[0].clientY);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      } else if (!animationFrameId) {
        animate();
      }
    }

    function onWindowResize() {
      const mountEl = mountRef.current;
      const width = mountEl?.clientWidth ?? window.innerWidth;
      const height = mountEl?.clientHeight ?? window.innerHeight;
      renderer.setSize(width, height);
      uniforms.r.value.set(width, height);
      renderer.setPixelRatio(maxPixelRatio);
    }

    let animationFrameId = 0;
    let lastFrameAt = 0;
    function animate(now = 0) {
      animationFrameId = requestAnimationFrame(animate);
      if (document.visibilityState === "hidden") return;

      if (frameIntervalMs > 0 && now - lastFrameAt < frameIntervalMs) return;
      lastFrameAt = now;

      uniforms.t.value = clock.getElapsedTime();
      if (!pointerActive && !isLite) {
        mouse.lerp(targetMouse, 0.08);
      }
      uniforms.mouse.value.copy(mouse);
      renderer.render(scene, camera);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.clearTimeout(pointerIdleTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onWindowResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant, performance]);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}
