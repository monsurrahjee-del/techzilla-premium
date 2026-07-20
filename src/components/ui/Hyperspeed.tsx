"use client";

import { useEffect, useRef, memo } from "react";
import * as THREE from "three";

/* ─── Types ───────────────────────────────────────────────────── */
type DistortionKey =
  | "turbulentDistortion"
  | "mountainDistortion"
  | "xyDistortion"
  | "LongRaceDistortion"
  | "deepDistortion";

interface HyperspeedColors {
  roadColor?: number;
  islandColor?: number;
  background?: number;
  shoulderLines?: number;
  brokenLines?: number;
  leftCars?: number[];
  rightCars?: number[];
  sticks?: number;
}

export interface HyperspeedOptions {
  onSpeedUp?: () => void;
  onSlowDown?: () => void;
  distortion?: DistortionKey;
  length?: number;
  roadWidth?: number;
  islandWidth?: number;
  lanesPerRoad?: number;
  fov?: number;
  fovSpeedUp?: number;
  speedUp?: number;
  carLightsFade?: number;
  totalSideLightSticks?: number;
  lightPairsPerRoadWay?: number;
  shoulderLinesWidthPercentage?: number;
  brokenLinesWidthPercentage?: number;
  brokenLinesLengthPercentage?: number;
  lightStickWidth?: [number, number];
  lightStickHeight?: [number, number];
  movingAwaySpeed?: [number, number];
  movingCloserSpeed?: [number, number];
  carLightsLength?: [number, number];
  carLightsRadius?: [number, number];
  carWidthPercentage?: [number, number];
  carShiftX?: [number, number];
  carFloorSeparation?: [number, number];
  colors?: HyperspeedColors;
}

const DEFAULT_OPTIONS: Required<HyperspeedOptions> = {
  onSpeedUp: () => {},
  onSlowDown: () => {},
  distortion: "turbulentDistortion",
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  },
};

/* ─── Helpers ─────────────────────────────────────────────────── */
function random(base: number | [number, number]): number {
  if (Array.isArray(base)) return Math.random() * (base[1] - base[0]) + base[0];
  return Math.random() * base;
}
function pickRandom<T>(arr: T | T[]): T {
  if (Array.isArray(arr)) return arr[Math.floor(Math.random() * arr.length)];
  return arr;
}
function lerp(current: number, target: number, speed = 0.1, limit = 0.001): number {
  let change = (target - current) * speed;
  if (Math.abs(change) < limit) change = target - current;
  return change;
}
function nsin(val: number): number {
  return Math.sin(val) * 0.5 + 0.5;
}

/* ─── Component ───────────────────────────────────────────────── */
function HyperspeedInner({ effectOptions = {} }: { effectOptions?: HyperspeedOptions }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRef = useRef<any>(null);

  useEffect(() => {
    if (appRef.current) {
      appRef.current.dispose();
      appRef.current = null;
    }

    const container = containerRef.current;
    if (!container) return;

    /* ── Distortion definitions ─────────────────────────── */
    const mountainUniforms = {
      uFreq: { value: new THREE.Vector3(3, 6, 10) },
      uAmp: { value: new THREE.Vector3(30, 30, 20) },
    };
    const xyUniforms = {
      uFreq: { value: new THREE.Vector2(5, 2) },
      uAmp: { value: new THREE.Vector2(25, 15) },
    };
    const LongRaceUniforms = {
      uFreq: { value: new THREE.Vector2(2, 3) },
      uAmp: { value: new THREE.Vector2(35, 10) },
    };
    const turbulentUniforms = {
      uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
      uAmp: { value: new THREE.Vector4(25, 5, 10, 10) },
    };
    const deepUniforms = {
      uFreq: { value: new THREE.Vector2(4, 8) },
      uAmp: { value: new THREE.Vector2(10, 20) },
      uPowY: { value: new THREE.Vector2(20, 2) },
    };

    const distortions: Record<string, { uniforms: object; getDistortion: string; getJS?: (p: number, t: number) => THREE.Vector3 }> = {
      mountainDistortion: {
        uniforms: mountainUniforms,
        getDistortion: `
          uniform vec3 uAmp; uniform vec3 uFreq;
          #define PI 3.14159265358979
          float nsin(float val){ return sin(val)*0.5+0.5; }
          vec3 getDistortion(float progress){
            float fix=0.02;
            return vec3(
              cos(progress*PI*uFreq.x+uTime)*uAmp.x - cos(fix*PI*uFreq.x+uTime)*uAmp.x,
              nsin(progress*PI*uFreq.y+uTime)*uAmp.y - nsin(fix*PI*uFreq.y+uTime)*uAmp.y,
              nsin(progress*PI*uFreq.z+uTime)*uAmp.z - nsin(fix*PI*uFreq.z+uTime)*uAmp.z
            );
          }`,
        getJS: (progress, time) => {
          const fix = 0.02;
          const uFreq = mountainUniforms.uFreq.value;
          const uAmp = mountainUniforms.uAmp.value;
          const d = new THREE.Vector3(
            Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x - Math.cos(fix * Math.PI * uFreq.x + time) * uAmp.x,
            nsin(progress * Math.PI * uFreq.y + time) * uAmp.y - nsin(fix * Math.PI * uFreq.y + time) * uAmp.y,
            nsin(progress * Math.PI * uFreq.z + time) * uAmp.z - nsin(fix * Math.PI * uFreq.z + time) * uAmp.z,
          );
          return d.multiply(new THREE.Vector3(2, 2, 2)).add(new THREE.Vector3(0, 0, -5));
        },
      },
      xyDistortion: {
        uniforms: xyUniforms,
        getDistortion: `
          uniform vec2 uFreq; uniform vec2 uAmp;
          #define PI 3.14159265358979
          vec3 getDistortion(float progress){
            float fix=0.02;
            return vec3(
              cos(progress*PI*uFreq.x+uTime)*uAmp.x - cos(fix*PI*uFreq.x+uTime)*uAmp.x,
              sin(progress*PI*uFreq.y+PI/2.+uTime)*uAmp.y - sin(fix*PI*uFreq.y+PI/2.+uTime)*uAmp.y,
              0.
            );
          }`,
        getJS: (progress, time) => {
          const fix = 0.02;
          const uFreq = xyUniforms.uFreq.value;
          const uAmp = xyUniforms.uAmp.value;
          const d = new THREE.Vector3(
            Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x - Math.cos(fix * Math.PI * uFreq.x + time) * uAmp.x,
            Math.sin(progress * Math.PI * uFreq.y + time + Math.PI / 2) * uAmp.y - Math.sin(fix * Math.PI * uFreq.y + time + Math.PI / 2) * uAmp.y,
            0,
          );
          return d.multiply(new THREE.Vector3(2, 0.4, 1)).add(new THREE.Vector3(0, 0, -3));
        },
      },
      LongRaceDistortion: {
        uniforms: LongRaceUniforms,
        getDistortion: `
          uniform vec2 uFreq; uniform vec2 uAmp;
          #define PI 3.14159265358979
          vec3 getDistortion(float progress){
            float cam=0.0125;
            return vec3(
              sin(progress*PI*uFreq.x+uTime)*uAmp.x - sin(cam*PI*uFreq.x+uTime)*uAmp.x,
              sin(progress*PI*uFreq.y+uTime)*uAmp.y - sin(cam*PI*uFreq.y+uTime)*uAmp.y,
              0.
            );
          }`,
        getJS: (progress, time) => {
          const cam = 0.0125;
          const uFreq = LongRaceUniforms.uFreq.value;
          const uAmp = LongRaceUniforms.uAmp.value;
          const d = new THREE.Vector3(
            Math.sin(progress * Math.PI * uFreq.x + time) * uAmp.x - Math.sin(cam * Math.PI * uFreq.x + time) * uAmp.x,
            Math.sin(progress * Math.PI * uFreq.y + time) * uAmp.y - Math.sin(cam * Math.PI * uFreq.y + time) * uAmp.y,
            0,
          );
          return d.multiply(new THREE.Vector3(1, 1, 0)).add(new THREE.Vector3(0, 0, -5));
        },
      },
      turbulentDistortion: {
        uniforms: turbulentUniforms,
        getDistortion: `
          uniform vec4 uFreq; uniform vec4 uAmp;
          float nsin(float val){ return sin(val)*0.5+0.5; }
          #define PI 3.14159265358979
          float getDistortionX(float progress){
            return cos(PI*progress*uFreq.r+uTime)*uAmp.r + pow(cos(PI*progress*uFreq.g+uTime*(uFreq.g/uFreq.r)),2.)*uAmp.g;
          }
          float getDistortionY(float progress){
            return -nsin(PI*progress*uFreq.b+uTime)*uAmp.b + -pow(nsin(PI*progress*uFreq.a+uTime/(uFreq.b/uFreq.a)),5.)*uAmp.a;
          }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress)-getDistortionX(0.0125),
              getDistortionY(progress)-getDistortionY(0.0125),
              0.
            );
          }`,
        getJS: (progress, time) => {
          const uFreq = turbulentUniforms.uFreq.value;
          const uAmp = turbulentUniforms.uAmp.value;
          const getX = (p: number) =>
            Math.cos(Math.PI * p * uFreq.x + time) * uAmp.x +
            Math.pow(Math.cos(Math.PI * p * uFreq.y + time * (uFreq.y / uFreq.x)), 2) * uAmp.y;
          const getY = (p: number) =>
            -nsin(Math.PI * p * uFreq.z + time) * uAmp.z -
            Math.pow(nsin(Math.PI * p * uFreq.w + time / (uFreq.z / uFreq.w)), 5) * uAmp.w;
          const d = new THREE.Vector3(getX(progress) - getX(progress + 0.007), getY(progress) - getY(progress + 0.007), 0);
          return d.multiply(new THREE.Vector3(-2, -5, 0)).add(new THREE.Vector3(0, 0, -10));
        },
      },
      deepDistortion: {
        uniforms: deepUniforms,
        getDistortion: `
          uniform vec2 uFreq; uniform vec2 uAmp; uniform vec2 uPowY;
          float nsin(float val){ return sin(val)*0.5+0.5; }
          #define PI 3.14159265358979
          float getDistortionX(float progress){ return sin(progress*PI*uFreq.x+uTime)*uAmp.x; }
          float getDistortionY(float progress){
            return pow(abs(progress*uPowY.x),uPowY.y)+sin(progress*PI*uFreq.y+uTime)*uAmp.y;
          }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress)-getDistortionX(0.02),
              getDistortionY(progress)-getDistortionY(0.02),
              0.
            );
          }`,
        getJS: (progress, time) => {
          const uFreq = deepUniforms.uFreq.value;
          const uAmp = deepUniforms.uAmp.value;
          const uPowY = deepUniforms.uPowY.value;
          const getX = (p: number) => Math.sin(p * Math.PI * uFreq.x + time) * uAmp.x;
          const getY = (p: number) =>
            Math.pow(p * uPowY.x, uPowY.y) + Math.sin(p * Math.PI * uFreq.y + time) * uAmp.y;
          const d = new THREE.Vector3(getX(progress) - getX(progress + 0.01), getY(progress) - getY(progress + 0.01), 0);
          return d.multiply(new THREE.Vector3(-2, -4, 0)).add(new THREE.Vector3(0, 0, -10));
        },
      },
    };

    /* ── Shader strings ─────────────────────────────────── */
    const carLightsFragment = `
      #define USE_FOG;
      ${THREE.ShaderChunk["fog_pars_fragment"]}
      varying vec3 vColor; varying vec2 vUv; uniform vec2 uFade;
      void main(){
        vec3 color=vec3(vColor);
        float alpha=smoothstep(uFade.x,uFade.y,vUv.x);
        gl_FragColor=vec4(color,alpha);
        if(gl_FragColor.a<0.0001)discard;
        ${THREE.ShaderChunk["fog_fragment"]}
      }`;

    const carLightsVertex = `
      #define USE_FOG;
      ${THREE.ShaderChunk["fog_pars_vertex"]}
      attribute vec3 aOffset; attribute vec3 aMetrics; attribute vec3 aColor;
      uniform float uTravelLength; uniform float uTime;
      varying vec2 vUv; varying vec3 vColor;
      #include <getDistortion_vertex>
      void main(){
        vec3 transformed=position.xyz;
        float radius=aMetrics.r; float myLength=aMetrics.g; float speed=aMetrics.b;
        transformed.xy*=radius; transformed.z*=myLength;
        transformed.z+=myLength-mod(uTime*speed+aOffset.z,uTravelLength);
        transformed.xy+=aOffset.xy;
        float progress=abs(transformed.z/uTravelLength);
        transformed.xyz+=getDistortion(progress);
        vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
        gl_Position=projectionMatrix*mvPosition;
        vUv=uv; vColor=aColor;
        ${THREE.ShaderChunk["fog_vertex"]}
      }`;

    const sideSticksFragment = `
      #define USE_FOG;
      ${THREE.ShaderChunk["fog_pars_fragment"]}
      varying vec3 vColor;
      void main(){ gl_FragColor=vec4(vColor,1.); ${THREE.ShaderChunk["fog_fragment"]} }`;

    const sideSticksVertex = `
      #define USE_FOG;
      ${THREE.ShaderChunk["fog_pars_vertex"]}
      attribute float aOffset; attribute vec3 aColor; attribute vec2 aMetrics;
      uniform float uTravelLength; uniform float uTime; varying vec3 vColor;
      mat4 rotationY(in float a){
        return mat4(cos(a),0,sin(a),0, 0,1,0,0, -sin(a),0,cos(a),0, 0,0,0,1);
      }
      #include <getDistortion_vertex>
      void main(){
        vec3 transformed=position.xyz;
        float width=aMetrics.x; float height=aMetrics.y;
        transformed.xy*=vec2(width,height);
        float time=mod(uTime*60.*2.+aOffset,uTravelLength);
        transformed=(rotationY(3.14/2.)*vec4(transformed,1.)).xyz;
        transformed.z+=-uTravelLength+time;
        float progress=abs(transformed.z/uTravelLength);
        transformed.xyz+=getDistortion(progress);
        transformed.y+=height/2.; transformed.x+=-width/2.;
        vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
        gl_Position=projectionMatrix*mvPosition;
        vColor=aColor;
        ${THREE.ShaderChunk["fog_vertex"]}
      }`;

    const roadMarkings_vars = `
      uniform float uLanes; uniform vec3 uBrokenLinesColor;
      uniform vec3 uShoulderLinesColor; uniform float uShoulderLinesWidthPercentage;
      uniform float uBrokenLinesWidthPercentage; uniform float uBrokenLinesLengthPercentage;
      highp float random(vec2 co){
        highp float a=12.9898; highp float b=78.233; highp float c=43758.5453;
        highp float dt=dot(co.xy,vec2(a,b)); highp float sn=mod(dt,3.14);
        return fract(sin(sn)*c);
      }`;

    const roadMarkings_fragment = `
      uv.y=mod(uv.y+uTime*0.05,1.);
      float laneWidth=1.0/uLanes;
      float brokenLineWidth=laneWidth*uBrokenLinesWidthPercentage;
      float laneEmptySpace=1.-uBrokenLinesLengthPercentage;
      float brokenLines=step(1.0-brokenLineWidth,fract(uv.x*2.0))*step(laneEmptySpace,fract(uv.y*10.0));
      float sideLines=step(1.0-brokenLineWidth,fract((uv.x-laneWidth*(uLanes-1.0))*2.0))+step(brokenLineWidth,uv.x);
      brokenLines=mix(brokenLines,sideLines,uv.x);`;

    const roadBaseFragment = `
      #define USE_FOG;
      varying vec2 vUv; uniform vec3 uColor; uniform float uTime;
      #include <roadMarkings_vars>
      ${THREE.ShaderChunk["fog_pars_fragment"]}
      void main(){
        vec2 uv=vUv; vec3 color=vec3(uColor);
        #include <roadMarkings_fragment>
        gl_FragColor=vec4(color,1.);
        ${THREE.ShaderChunk["fog_fragment"]}
      }`;

    const islandFragment = roadBaseFragment
      .replace("#include <roadMarkings_fragment>", "")
      .replace("#include <roadMarkings_vars>", "");

    const roadFragment = roadBaseFragment
      .replace("#include <roadMarkings_fragment>", roadMarkings_fragment)
      .replace("#include <roadMarkings_vars>", roadMarkings_vars);

    const roadVertex = `
      #define USE_FOG;
      uniform float uTime;
      ${THREE.ShaderChunk["fog_pars_vertex"]}
      uniform float uTravelLength; varying vec2 vUv;
      #include <getDistortion_vertex>
      void main(){
        vec3 transformed=position.xyz;
        vec3 distortion=getDistortion((transformed.y+uTravelLength/2.)/uTravelLength);
        transformed.x+=distortion.x; transformed.z+=distortion.y; transformed.y+=-1.*distortion.z;
        vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
        gl_Position=projectionMatrix*mvPosition; vUv=uv;
        ${THREE.ShaderChunk["fog_vertex"]}
      }`;

    /* ── Scene classes ──────────────────────────────────── */
    const opts = {
      ...DEFAULT_OPTIONS,
      ...effectOptions,
      colors: { ...DEFAULT_OPTIONS.colors, ...effectOptions?.colors },
    };
    const distortionDef = distortions[opts.distortion ?? "turbulentDistortion"] ?? distortions.turbulentDistortion;

    const initW = Math.max(1, container.offsetWidth);
    const initH = Math.max(1, container.offsetHeight);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(initW, initH, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(opts.fov, initW / initH, 0.1, 10000);
    camera.position.set(0, 8, -5);
    const scene = new THREE.Scene();
    scene.background = null;

    const fog = new THREE.Fog(opts.colors.background ?? 0x000000, opts.length * 0.2, opts.length * 500);
    scene.fog = fog;
    const fogUniforms = {
      fogColor: { value: fog.color },
      fogNear: { value: fog.near },
      fogFar: { value: fog.far },
    };

    const clock = new THREE.Clock();
    let disposed = false;
    let fovTarget = opts.fov;
    let speedUpTarget = 0;
    let speedUp = 0;
    let timeOffset = 0;

    /* CarLights */
    const makeCarLights = (colors: number[], speed: [number, number], fade: THREE.Vector2) => {
      const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
      const geo = new THREE.TubeGeometry(curve, 40, 1, 8, false);
      const instanced = new THREE.InstancedBufferGeometry().copy(geo as unknown as THREE.InstancedBufferGeometry);
      instanced.instanceCount = opts.lightPairsPerRoadWay * 2;
      const laneWidth = opts.roadWidth / opts.lanesPerRoad;
      const aOffset: number[] = [], aMetrics: number[] = [], aColor: number[] = [];
      const colorObjs = colors.map((c) => new THREE.Color(c));
      for (let i = 0; i < opts.lightPairsPerRoadWay; i++) {
        const r = random(opts.carLightsRadius), len = random(opts.carLightsLength), spd = random(speed);
        const carLane = i % opts.lanesPerRoad;
        let laneX = carLane * laneWidth - opts.roadWidth / 2 + laneWidth / 2;
        laneX += random(opts.carShiftX) * laneWidth;
        const offsetY = random(opts.carFloorSeparation) + r * 1.3;
        const offsetZ = -random(opts.length);
        const carW = random(opts.carWidthPercentage) * laneWidth;
        aOffset.push(laneX - carW / 2, offsetY, offsetZ, laneX + carW / 2, offsetY, offsetZ);
        aMetrics.push(r, len, spd, r, len, spd);
        const col = pickRandom(colorObjs);
        aColor.push(col.r, col.g, col.b, col.r, col.g, col.b);
      }
      instanced.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false));
      instanced.setAttribute("aMetrics", new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false));
      instanced.setAttribute("aColor", new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false));
      const mat = new THREE.ShaderMaterial({
        fragmentShader: carLightsFragment,
        vertexShader: carLightsVertex,
        transparent: true,
        uniforms: Object.assign({ uTime: { value: 0 }, uTravelLength: { value: opts.length }, uFade: { value: fade } }, fogUniforms, distortionDef.uniforms),
      });
      mat.onBeforeCompile = (s) => {
        s.vertexShader = s.vertexShader.replace("#include <getDistortion_vertex>", distortionDef.getDistortion);
      };
      const mesh = new THREE.Mesh(instanced, mat);
      mesh.frustumCulled = false;
      scene.add(mesh);
      return mesh;
    };

    /* LightSticks */
    const stickGeo = new THREE.PlaneGeometry(1, 1);
    const stickInstanced = new THREE.InstancedBufferGeometry().copy(stickGeo as unknown as THREE.InstancedBufferGeometry);
    stickInstanced.instanceCount = opts.totalSideLightSticks;
    const stickOffset = opts.length / (opts.totalSideLightSticks - 1);
    const saO: number[] = [], saC: number[] = [], saM: number[] = [];
    const stickCol = new THREE.Color(opts.colors.sticks ?? 0x03b3c3);
    for (let i = 0; i < opts.totalSideLightSticks; i++) {
      saO.push((i - 1) * stickOffset * 2 + stickOffset * Math.random());
      saC.push(stickCol.r, stickCol.g, stickCol.b);
      saM.push(random(opts.lightStickWidth), random(opts.lightStickHeight));
    }
    stickInstanced.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(saO), 1, false));
    stickInstanced.setAttribute("aColor", new THREE.InstancedBufferAttribute(new Float32Array(saC), 3, false));
    stickInstanced.setAttribute("aMetrics", new THREE.InstancedBufferAttribute(new Float32Array(saM), 2, false));
    const stickMat = new THREE.ShaderMaterial({
      fragmentShader: sideSticksFragment,
      vertexShader: sideSticksVertex,
      side: THREE.DoubleSide,
      uniforms: Object.assign({ uTravelLength: { value: opts.length }, uTime: { value: 0 } }, fogUniforms, distortionDef.uniforms),
    });
    stickMat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace("#include <getDistortion_vertex>", distortionDef.getDistortion);
    };
    const stickMesh = new THREE.Mesh(stickInstanced, stickMat);
    stickMesh.frustumCulled = false;
    stickMesh.position.setX(-(opts.roadWidth + opts.islandWidth / 2));
    scene.add(stickMesh);

    /* Road planes */
    const makeRoadPlane = (side: number, isRoad: boolean) => {
      const uTimeShared = { value: 0 };
      const geo = new THREE.PlaneGeometry(
        isRoad ? opts.roadWidth : opts.islandWidth,
        opts.length, 20, 100,
      );
      let uniforms: Record<string, unknown> = {
        uTravelLength: { value: opts.length },
        uColor: { value: new THREE.Color(isRoad ? (opts.colors.roadColor ?? 0x080808) : (opts.colors.islandColor ?? 0x0a0a0a)) },
        uTime: uTimeShared,
      };
      if (isRoad) {
        uniforms = {
          ...uniforms,
          uLanes: { value: opts.lanesPerRoad },
          uBrokenLinesColor: { value: new THREE.Color(opts.colors.brokenLines ?? 0xffffff) },
          uShoulderLinesColor: { value: new THREE.Color(opts.colors.shoulderLines ?? 0xffffff) },
          uShoulderLinesWidthPercentage: { value: opts.shoulderLinesWidthPercentage },
          uBrokenLinesLengthPercentage: { value: opts.brokenLinesLengthPercentage },
          uBrokenLinesWidthPercentage: { value: opts.brokenLinesWidthPercentage },
        };
      }
      const mat = new THREE.ShaderMaterial({
        fragmentShader: isRoad ? roadFragment : islandFragment,
        vertexShader: roadVertex,
        side: THREE.DoubleSide,
        uniforms: Object.assign(uniforms as Record<string, THREE.IUniform>, fogUniforms, distortionDef.uniforms),
      });
      mat.onBeforeCompile = (s) => {
        s.vertexShader = s.vertexShader.replace("#include <getDistortion_vertex>", distortionDef.getDistortion);
      };
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z = -opts.length / 2;
      mesh.position.x += (opts.islandWidth / 2 + opts.roadWidth / 2) * side;
      scene.add(mesh);
      return { mesh, uTime: uTimeShared };
    };

    const leftRoad = makeRoadPlane(-1, true);
    const rightRoad = makeRoadPlane(1, true);
    const island = makeRoadPlane(0, false);

    const leftCars = makeCarLights(
      opts.colors.leftCars ?? [0xd856bf, 0x6750a2, 0xc247ac],
      opts.movingAwaySpeed,
      new THREE.Vector2(0, 1 - opts.carLightsFade),
    );
    leftCars.position.setX(-opts.roadWidth / 2 - opts.islandWidth / 2);

    const rightCars = makeCarLights(
      opts.colors.rightCars ?? [0x03b3c3, 0x0e5ea5, 0x324555],
      opts.movingCloserSpeed,
      new THREE.Vector2(1, opts.carLightsFade),
    );
    rightCars.position.setX(opts.roadWidth / 2 + opts.islandWidth / 2);

    /* Resize */
    const onResize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (w <= 0 || h <= 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* Mouse speed-up */
    const onDown = () => { fovTarget = opts.fovSpeedUp; speedUpTarget = opts.speedUp; };
    const onUp = () => { fovTarget = opts.fov; speedUpTarget = 0; };
    container.addEventListener("mousedown", onDown);
    container.addEventListener("mouseup", onUp);
    container.addEventListener("mouseout", onUp);
    container.addEventListener("touchstart", onDown, { passive: true });
    container.addEventListener("touchend", onUp, { passive: true });

    /* Tick */
    const tick = () => {
      if (disposed) return;
      const delta = clock.getDelta();
      const lp = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta);

      speedUp += lerp(speedUp, speedUpTarget, lp, 0.00001);
      timeOffset += speedUp * delta;
      const time = clock.elapsedTime + timeOffset;

      // Update car lights
      (leftCars.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      (rightCars.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      (stickMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      leftRoad.uTime.value = time;
      rightRoad.uTime.value = time;
      island.uTime.value = time;

      const fovChange = lerp(camera.fov, fovTarget, lp);
      if (fovChange !== 0) {
        camera.fov += fovChange * delta * 6;
        camera.updateProjectionMatrix();
      }

      if (distortionDef.getJS) {
        const d = distortionDef.getJS(0.025, time);
        camera.lookAt(new THREE.Vector3(camera.position.x + d.x, camera.position.y + d.y, camera.position.z + d.z));
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    appRef.current = {
      dispose: () => {
        disposed = true;
        window.removeEventListener("resize", onResize);
        container.removeEventListener("mousedown", onDown);
        container.removeEventListener("mouseup", onUp);
        container.removeEventListener("mouseout", onUp);
        container.removeEventListener("touchstart", onDown);
        container.removeEventListener("touchend", onUp);
        scene.traverse((obj) => {
          const o = obj as THREE.Mesh;
          if (!o.isMesh) return;
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        });
        scene.clear();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.parentNode?.removeChild(renderer.domElement);
      },
    };

    return () => {
      appRef.current?.dispose();
      appRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectOptions]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "absolute",
        inset: 0,
      }}
    />
  );
}

const Hyperspeed = memo(HyperspeedInner);
export default Hyperspeed;
