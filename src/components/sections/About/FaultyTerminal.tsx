"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;
uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
float time;
float hash21(vec2 p){p=fract(p*234.56);p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){return sin(p.x*10.0)*sin(p.y*(3.0+sin(time*0.090909)))+0.2;}
mat2 rotate(float a){float c=cos(a);float s=sin(a);return mat2(c,-s,s,c);}
float fbm(vec2 p){p*=1.1;float f=0.0;float amp=0.5*uNoiseAmp;mat2 m0=rotate(time*0.02);f+=amp*noise(p);p=m0*p*2.0;amp*=0.454545;mat2 m1=rotate(time*0.02);f+=amp*noise(p);p=m1*p*2.0;amp*=0.454545;mat2 m2=rotate(time*0.08);f+=amp*noise(p);return f;}
float pattern(vec2 p,out vec2 q,out vec2 r){vec2 o1=vec2(1.0);vec2 o0=vec2(0.0);mat2 r01=rotate(0.1*time);mat2 r1=rotate(0.1);q=vec2(fbm(p+o1),fbm(r01*p+o1));r=vec2(fbm(r1*q+o0),fbm(q+o0));return fbm(p+r);}
float digit(vec2 p){
  vec2 grid=uGridMul*15.0;vec2 s=floor(p*grid)/grid;p=p*grid;vec2 q,r;
  float intensity=pattern(s*0.1,q,r)*1.3-0.03;
  if(uUseMouse>0.5){vec2 mw=uMouse*uScale;float d=distance(s,mw);float mi=exp(-d*8.0)*uMouseStrength*10.0;intensity+=mi;intensity+=sin(d*20.0-iTime*5.0)*0.1*mi;}
  if(uUsePageLoadAnimation>0.5){float cr=fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);float cp=clamp((uPageLoadProgress-cr*0.8)/0.2,0.0,1.0);intensity*=smoothstep(0.0,1.0,cp);}
  p=fract(p);p*=uDigitSize;float px5=p.x*5.0;float py5=(1.0-p.y)*5.0;
  float x=fract(px5);float y=fract(py5);float i=floor(py5)-2.0;float j=floor(px5)-2.0;
  float n=i*i+j*j;float f=n*0.0625;float isOn=step(0.1,intensity-f);
  return step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0)*isOn*(0.2+y*0.8)*(0.75+x*0.25);
}
float onOff(float a,float b,float c){return step(c,sin(iTime+a*cos(iTime*b)))*uFlickerAmount;}
float displace(vec2 look){float y=look.y-mod(iTime*0.25,1.0);float window=1.0/(1.0+50.0*y*y);return sin(look.y*20.0+iTime)*0.0125*onOff(4.0,2.0,0.8)*(1.0+cos(iTime*60.0))*window;}
vec3 getColor(vec2 p){
  float bar=step(mod(p.y+time*20.0,1.0),0.2)*0.4+1.0;bar*=uScanlineIntensity;
  float displacement=displace(p);p.x+=displacement;
  if(uGlitchAmount!=1.0)p.x+=displacement*(uGlitchAmount-1.0);
  float middle=digit(p);const float off=0.002;
  float sum=digit(p+vec2(-off,-off))+digit(p+vec2(0.0,-off))+digit(p+vec2(off,-off))+digit(p+vec2(-off,0.0))+digit(p)+digit(p+vec2(off,0.0))+digit(p+vec2(-off,off))+digit(p+vec2(0.0,off))+digit(p+vec2(off,off));
  return vec3(0.9)*middle+sum*0.1*vec3(1.0)*bar;
}
vec2 barrel(vec2 uv){vec2 c=uv*2.0-1.0;float r2=dot(c,c);c*=1.0+uCurvature*r2;return c*0.5+0.5;}
void main(){
  time=iTime*0.333333;vec2 uv=vUv;
  if(uCurvature!=0.0)uv=barrel(uv);
  vec2 p=uv*uScale;vec3 col=getColor(p);
  if(uChromaticAberration!=0.0){vec2 ca=vec2(uChromaticAberration)/iResolution.xy;col.r=getColor(p+ca).r;col.b=getColor(p-ca).b;}
  col*=uTint*uBrightness;
  if(uDither>0.0)col+=(hash21(gl_FragCoord.xy)-0.5)*(uDither*0.003922);
  gl_FragColor=vec4(col,1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface FaultyTerminalProps {
  scale?: number;
  gridMul?: [number, number];
  digitSize?: number;
  timeScale?: number;
  pause?: boolean;
  scanlineIntensity?: number;
  glitchAmount?: number;
  flickerAmount?: number;
  noiseAmp?: number;
  chromaticAberration?: number;
  dither?: number | boolean;
  curvature?: number;
  tint?: string;
  mouseReact?: boolean;
  mouseStrength?: number;
  /** How quickly the on-screen cursor tracks the real mouse. 0=frozen, 1=instant. Default 0.15 */
  mouseLerp?: number;
  pageLoadAnimation?: boolean;
  brightness?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function FaultyTerminal({
  scale = 1,
  gridMul = [2, 1],
  digitSize = 1.5,
  timeScale = 0.3,
  pause = false,
  scanlineIntensity = 0.3,
  glitchAmount = 1,
  flickerAmount = 1,
  noiseAmp = 0,
  chromaticAberration = 0,
  dither = 0,
  curvature = 0.2,
  tint = "#ffffff",
  mouseReact = true,
  mouseStrength = 0.2,
  mouseLerp = 0.15,
  pageLoadAnimation = true,
  brightness = 1,
  className = "",
  style,
}: FaultyTerminalProps) {
  const containerRef        = useRef<HTMLDivElement>(null);
  const glRef               = useRef<WebGLRenderingContext | null>(null);
  const rafRef              = useRef<number>(0);
  const updateFnRef         = useRef<((t: number) => void) | null>(null);
  const pauseRef            = useRef(pause);          // always-current mirror
  const mouseLerpRef        = useRef(mouseLerp);      // always-current — render loop closure won't go stale
  const mouseRef            = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef      = useRef({ x: 0.5, y: 0.5 });
  const frozenTimeRef       = useRef(0);
  const loadAnimStartRef    = useRef(0);
  const timeOffsetRef       = useRef(Math.random() * 100);
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

  const tintVec    = useMemo(() => hexToRgb(tint), [tint]);
  const ditherVal  = useMemo(() => (typeof dither === "boolean" ? (dither ? 1 : 0) : dither), [dither]);

  // Keep mouseLerpRef current so the render-loop closure always reads the live value
  useEffect(() => { mouseLerpRef.current = mouseLerp; }, [mouseLerp]);

  // Listen on window instead of the container so pointer-events:none layers
  // still receive mouse coordinates.
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // The About section fills the full viewport, so window dimensions are
    // equivalent to the container rect — and avoid getBoundingClientRect()
    // which forces a synchronous layout reflow on every mousemove event
    // (especially costly while the section is still mid-translateX transition).
    mouseRef.current = {
      x: e.clientX / window.innerWidth,
      y: 1 - e.clientY / window.innerHeight,
    };
  }, []);

  // ── Second effect: toggle rAF + mouse listener without destroying WebGL ─────
  useEffect(() => {
    pauseRef.current = pause;
    if (pause) {
      // Stop the render loop
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      // Detach window listener while paused to avoid unnecessary work
      if (mouseReact) window.removeEventListener("mousemove", handleMouseMove);
    } else {
      // Re-attach window listener before resuming
      if (mouseReact) window.addEventListener("mousemove", handleMouseMove, { passive: true });
      if (!rafRef.current && updateFnRef.current) {
        rafRef.current = requestAnimationFrame(updateFnRef.current);
      }
    }
  }, [pause, mouseReact, handleMouseMove]);

  // ── Main effect: WebGL setup — no `pause` in deps ─────────────────────────
  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    ctn.appendChild(canvas);

    const gl = canvas.getContext("webgl") as WebGLRenderingContext;
    if (!gl) { ctn.removeChild(canvas); return; }
    glRef.current = gl;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(prog); gl.useProgram(prog);

    // Full-screen triangle
    const pos = new Float32Array([-1,-1, 3,-1, -1,3]);
    const uvs = new Float32Array([0,0, 2,0, 0,2]);
    const pb = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(prog, "position"); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    const ub = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, ub); gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const ul = gl.getAttribLocation(prog, "uv"); gl.enableVertexAttribArray(ul); gl.vertexAttribPointer(ul, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uTime=U("iTime"), uRes=U("iResolution"), uSc=U("uScale"), uGM=U("uGridMul"),
      uDS=U("uDigitSize"), uSI=U("uScanlineIntensity"), uGA=U("uGlitchAmount"),
      uFA=U("uFlickerAmount"), uNA=U("uNoiseAmp"), uCA=U("uChromaticAberration"),
      uDi=U("uDither"), uCu=U("uCurvature"), uTi=U("uTint"),
      uMo=U("uMouse"), uMS=U("uMouseStrength"), uUM=U("uUseMouse"),
      uLP=U("uPageLoadProgress"), uUL=U("uUsePageLoadAnimation"), uBr=U("uBrightness");

    const resize = () => {
      if (!ctn) return;
      const w = ctn.offsetWidth * dpr, h = ctn.offsetHeight * dpr;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform3f(uRes, w, h, w / h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(ctn);
    resize();

    gl.uniform1f(uSc, scale);
    gl.uniform2fv(uGM, new Float32Array(gridMul));
    gl.uniform1f(uDS, digitSize);
    gl.uniform1f(uSI, scanlineIntensity);
    gl.uniform1f(uGA, glitchAmount);
    gl.uniform1f(uFA, flickerAmount);
    gl.uniform1f(uNA, noiseAmp);
    gl.uniform1f(uCA, chromaticAberration);
    gl.uniform1f(uDi, ditherVal);
    gl.uniform1f(uCu, curvature);
    gl.uniform3fv(uTi, new Float32Array(tintVec));
    gl.uniform1f(uMS, mouseStrength);
    gl.uniform1f(uUM, mouseReact ? 1 : 0);
    gl.uniform1f(uLP, pageLoadAnimation ? 0 : 1);
    gl.uniform1f(uUL, pageLoadAnimation ? 1 : 0);
    gl.uniform1f(uBr, brightness);

    // Hard 30 fps cap — halves main-thread work vs 60 fps, freeing the event
    // loop budget that mousemove handlers need for lag-free cursor response.
    let _lastFt = 0;
    const update = (t: number) => {
      rafRef.current = requestAnimationFrame(update);
      if (t - _lastFt < 33) return;
      _lastFt = t;
      if (pageLoadAnimation && !loadAnimStartRef.current) loadAnimStartRef.current = t;

      // Use pauseRef.current (always fresh) — no stale closure
      if (!pauseRef.current) {
        const elapsed = (t * 0.001 + timeOffsetRef.current) * timeScale;
        gl.uniform1f(uTime, elapsed);
        frozenTimeRef.current = elapsed;
      } else {
        gl.uniform1f(uTime, frozenTimeRef.current);
      }

      if (pageLoadAnimation && loadAnimStartRef.current) {
        gl.uniform1f(uLP, Math.min((t - loadAnimStartRef.current) / 2000, 1));
      }
      if (mouseReact) {
        const sm = smoothMouseRef.current, m = mouseRef.current;
        const lr = mouseLerpRef.current;
        sm.x += (m.x - sm.x) * lr; sm.y += (m.y - sm.y) * lr;
        gl.uniform2f(uMo, sm.x, sm.y);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Store the update fn so the second effect can restart it
    updateFnRef.current = update;

    // Only start the rAF if not paused
    if (!pauseRef.current) {
      rafRef.current = requestAnimationFrame(update);
    }

    // Attach to window so pointer-events:none on the container doesn't block events
    if (mouseReact) window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
      updateFnRef.current = null;
      ro.disconnect();
      if (mouseReact) window.removeEventListener("mousemove", handleMouseMove);
      if (canvas.parentElement === ctn) ctn.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      loadAnimStartRef.current = 0;
      timeOffsetRef.current = Math.random() * 100;
    };
  }, [
    // pause intentionally excluded — handled by the second effect above
    dpr, timeScale, scale, gridMul, digitSize, scanlineIntensity,
    glitchAmount, flickerAmount, noiseAmp, chromaticAberration, ditherVal,
    curvature, tintVec, mouseReact, mouseStrength, pageLoadAnimation,
    brightness, handleMouseMove,
  ]);

  return (
    <div ref={containerRef} className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }} />
  );
}
