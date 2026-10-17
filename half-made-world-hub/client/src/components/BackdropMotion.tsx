import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
 * Live backdrop: a slow-drifting aurora / nebula sky. A full-screen fragment
 * shader warps layered value noise into flowing ribbons of teal, violet and
 * brass over deep ink, with sparse twinkling stars. The field eases with the
 * pointer and scroll for a sense of depth, and time keeps it in constant,
 * gentle motion. Honours prefers-reduced-motion by rendering one frame.
 *
 * The canvas is created inside the effect and appended to the host so each
 * mount gets a fresh context (safe under React StrictMode's double-invoke),
 * and the setup is guarded so any failure degrades to the static gradient
 * instead of taking the app down.
 */

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uScroll;

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
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p = rot * p * 2.0 + 11.3;
    amp *= 0.5;
  }
  return v;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  p += uPointer * 0.03;
  p.y += uScroll * 0.00035;

  float t = uTime;
  vec2 flow = vec2(t * 0.014, t * -0.009);

  vec2 q = p * 2.1;
  vec2 warp = vec2(fbm(q + flow), fbm(q + vec2(4.7, 2.3) - flow));
  float n = fbm(q + warp * 1.6 + flow);
  float n2 = fbm(q * 1.9 - flow * 1.3 + vec2(3.5, -1.8));
  float clouds = n * 0.65 + n2 * 0.35;

  // Ribbons read strongest toward the top, with a slow travelling sway.
  float vertical = smoothstep(0.12, 0.95, vUv.y + 0.22 * sin(vUv.x * 3.0 + t * 0.15));
  float energy = smoothstep(0.42, 0.95, clouds) * (0.42 + 0.58 * vertical);

  vec3 ink = vec3(0.020, 0.024, 0.034);
  vec3 indigo = vec3(0.09, 0.11, 0.22);
  vec3 teal = vec3(0.16, 0.40, 0.44);
  vec3 violet = vec3(0.36, 0.24, 0.58);
  vec3 brass = vec3(0.68, 0.55, 0.34);

  vec3 col = ink;
  col = mix(col, indigo, smoothstep(0.28, 0.85, clouds) * 0.85);
  float hue = smoothstep(0.32, 0.9, fbm(q * 0.7 + flow * 0.5 + 2.0));
  col = mix(col, mix(teal, violet, hue), energy * 0.62);
  col += brass * pow(clouds, 5.0) * mix(0.2, 0.6, energy) * 0.5;

  // Sparse, twinkling stars.
  vec2 sp = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5) * 150.0;
  vec2 cell = floor(sp);
  float rnd = hash(cell);
  float starMask = step(0.984, rnd);
  float star = starMask * smoothstep(0.16, 0.0, length(fract(sp) - 0.5));
  star *= 0.5 + 0.5 * sin(t * 1.6 + rnd * 60.0);
  col += vec3(0.70, 0.77, 0.90) * star * 0.65;

  // Soft vignette keeps the manuscript readable over the sky.
  float vig = smoothstep(1.30, 0.30, length(p * vec2(1.0, 0.85)));
  col *= mix(0.5, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    return !!(
      probe.getContext('webgl2') ||
      probe.getContext('webgl') ||
      probe.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export function BackdropMotion() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supportsWebGL()) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let raf = 0;
    let disposed = false;
    let resize = () => {};

    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let scrollY = window.scrollY || 0;

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      scrollY = window.scrollY || 0;
    };

    const removeListeners = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
    };

    try {
      const canvas = document.createElement('canvas');
      canvasEl = canvas;
      canvas.className = 'bg-motion-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      host.appendChild(canvas);

      geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uScroll: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
      });

      const scene = new THREE.Scene();
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      resize = () => {
        if (!renderer || !material) return;
        const w = window.innerWidth;
        const h = Math.max(window.innerHeight, 1);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.setSize(w, h, false);
        material.uniforms.uResolution.value.set(w, h);
      };
      resize();

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', resize);

      const clock = new THREE.Clock();

      const renderFrame = () => {
        if (disposed || !renderer || !material) return;
        const t = clock.getElapsedTime();
        material.uniforms.uTime.value = t;

        eased.x += (pointer.x - eased.x) * 0.04;
        eased.y += (pointer.y - eased.y) * 0.04;
        material.uniforms.uPointer.value.set(eased.x, eased.y);
        material.uniforms.uScroll.value = Math.min(scrollY, 4000);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(renderFrame);
      };

      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        renderer.render(scene, camera);
      } else {
        raf = requestAnimationFrame(renderFrame);
      }
    } catch (err) {
      // Any setup failure: fall back silently to the static gradient.
      console.warn('Backdrop motion disabled:', err);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeListeners();
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      if (canvasEl && canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    };
  }, []);

  return <div ref={hostRef} className="bg-motion" aria-hidden="true" />;
}
