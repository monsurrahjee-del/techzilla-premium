// @ts-nocheck
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LiquidEther({
  paused = false,         // ← NEW: start stopped; page.tsx activates on scroll
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ["#5227FF", "#FF9FFC", "#B497CF"],
  style = {},
  className = "",
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6,
}) {
  const mountRef     = useRef(null);
  const webglRef     = useRef(null);
  const rafRef       = useRef(null);
  const isVisibleRef = useRef(true);
  const pausedRef    = useRef(paused);   // always-current mirror of the prop

  // ── Second effect: toggle when paused prop changes ────────────────────────
  useEffect(() => {
    pausedRef.current = paused;
    if (!webglRef.current) return;
    if (paused) {
      webglRef.current.pause();
    } else if (isVisibleRef.current && !document.hidden) {
      webglRef.current.start();
    }
  }, [paused]);

  // ── Main effect: full WebGL setup ─────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;

    function makePaletteTexture(stops) {
      let arr = Array.isArray(stops) && stops.length > 0
        ? (stops.length === 1 ? [stops[0], stops[0]] : stops)
        : ["#ffffff", "#ffffff"];
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i*4]   = Math.round(c.r*255);
        data[i*4+1] = Math.round(c.g*255);
        data[i*4+2] = Math.round(c.b*255);
        data[i*4+3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    class CommonClass {
      width=0; height=0; aspect=1; pixelRatio=1;
      fboWidth=null; fboHeight=null; time=0; delta=0;
      container=null; renderer=null; clock=null;
      init(container) {
        this.container=container;
        this.pixelRatio=Math.min(window.devicePixelRatio||1,2);
        this.resize();
        this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
        this.renderer.autoClear=false;
        this.renderer.setClearColor(new THREE.Color(0),0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width,this.height);
        this.renderer.domElement.style.cssText="width:100%;height:100%;display:block;";
        this.clock=new THREE.Clock(); this.clock.start();
      }
      resize() {
        if(!this.container)return;
        const r=this.container.getBoundingClientRect();
        this.width=Math.max(1,Math.floor(r.width));
        this.height=Math.max(1,Math.floor(r.height));
        this.aspect=this.width/this.height;
        if(this.renderer)this.renderer.setSize(this.width,this.height,false);
      }
      update(){this.delta=this.clock.getDelta();this.time+=this.delta;}
    }
    const Common=new CommonClass();

    class MouseClass {
      mouseMoved=false; coords=new THREE.Vector2(); coords_old=new THREE.Vector2();
      diff=new THREE.Vector2(); timer=null; container=null; docTarget=null;
      listenerTarget=null; isHoverInside=false; hasUserControl=false;
      isAutoActive=false; autoIntensity=2.0; takeoverActive=false;
      takeoverStartTime=0; takeoverDuration=0; // 0 = instant; was 0.25 s which felt like cursor lag
      takeoverFrom=new THREE.Vector2(); takeoverTo=new THREE.Vector2(); onInteract=null;
      constructor(){
        this._onMouseMove=this.onDocumentMouseMove.bind(this);
        this._onTouchStart=this.onDocumentTouchStart.bind(this);
        this._onTouchMove=this.onDocumentTouchMove.bind(this);
        this._onTouchEnd=this.onTouchEnd.bind(this);
        this._onDocumentLeave=this.onDocumentLeave.bind(this);
        this._listenersActive=false;
      }
      init(container){
        this.container=container;
        this.docTarget=container.ownerDocument||null;
        const dv=(this.docTarget&&this.docTarget.defaultView)||(typeof window!=="undefined"?window:null);
        if(!dv)return; this.listenerTarget=dv;
        // Don't attach listeners here — caller decides via resume()
      }
      // Attach event listeners (call when sim becomes active)
      resume(){
        if(this._listenersActive||!this.listenerTarget)return;
        this._listenersActive=true;
        this.listenerTarget.addEventListener("mousemove",this._onMouseMove);
        this.listenerTarget.addEventListener("touchstart",this._onTouchStart,{passive:true});
        this.listenerTarget.addEventListener("touchmove",this._onTouchMove,{passive:true});
        this.listenerTarget.addEventListener("touchend",this._onTouchEnd);
        if(this.docTarget)this.docTarget.addEventListener("mouseleave",this._onDocumentLeave);
      }
      // Remove event listeners without destroying the object (call when pausing)
      suspend(){
        if(!this._listenersActive||!this.listenerTarget)return;
        this._listenersActive=false;
        this.listenerTarget.removeEventListener("mousemove",this._onMouseMove);
        this.listenerTarget.removeEventListener("touchstart",this._onTouchStart);
        this.listenerTarget.removeEventListener("touchmove",this._onTouchMove);
        this.listenerTarget.removeEventListener("touchend",this._onTouchEnd);
        if(this.docTarget)this.docTarget.removeEventListener("mouseleave",this._onDocumentLeave);
      }
      dispose(){
        this.suspend();
        this.listenerTarget=null; this.docTarget=null; this.container=null;
      }
      isPointInside(cx,cy){
        if(!this.container)return false;
        // About fills the viewport — use window bounds to avoid getBoundingClientRect()
        // (forced layout on every mousemove while About is translateX-animating).
        return cx>=0&&cx<=window.innerWidth&&cy>=0&&cy<=window.innerHeight;
      }
      updateHoverState(cx,cy){this.isHoverInside=this.isPointInside(cx,cy);return this.isHoverInside;}
      setCoords(x,y){
        if(!this.container)return;
        if(this.timer)window.clearTimeout(this.timer);
        // About fills the viewport — window dims == container dims, no getBoundingClientRect().
        const iw=window.innerWidth,ih=window.innerHeight;
        if(!iw||!ih)return;
        this.coords.set(x/iw*2-1,-((y/ih)*2-1));
        this.mouseMoved=true;
        this.timer=window.setTimeout(()=>{this.mouseMoved=false;},100);
      }
      setNormalized(nx,ny){this.coords.set(nx,ny);this.mouseMoved=true;}
      onDocumentMouseMove(e){
        if(!this.updateHoverState(e.clientX,e.clientY))return;
        if(this.onInteract)this.onInteract();
        if(this.isAutoActive&&!this.hasUserControl&&!this.takeoverActive){
          if(!this.container)return;
          const iw=window.innerWidth,ih=window.innerHeight;
          if(!iw||!ih)return;
          const nx=e.clientX/iw; const ny=e.clientY/ih;
          this.takeoverFrom.copy(this.coords);
          this.takeoverTo.set(nx*2-1,-(ny*2-1));
          this.takeoverStartTime=performance.now();
          this.takeoverActive=true; this.hasUserControl=true; this.isAutoActive=false;
          return;
        }
        this.setCoords(e.clientX,e.clientY); this.hasUserControl=true;
      }
      onDocumentTouchStart(e){
        if(e.touches.length!==1)return;
        const t=e.touches[0];
        if(!this.updateHoverState(t.clientX,t.clientY))return;
        if(this.onInteract)this.onInteract();
        this.setCoords(t.clientX,t.clientY); this.hasUserControl=true;
      }
      onDocumentTouchMove(e){
        if(e.touches.length!==1)return;
        const t=e.touches[0];
        if(!this.updateHoverState(t.clientX,t.clientY))return;
        if(this.onInteract)this.onInteract();
        this.setCoords(t.clientX,t.clientY);
      }
      onTouchEnd(){this.isHoverInside=false;}
      onDocumentLeave(){this.isHoverInside=false;}
      update(){
        if(this.takeoverActive){
          const t=(performance.now()-this.takeoverStartTime)/(this.takeoverDuration*1000);
          if(t>=1){this.takeoverActive=false;this.coords.copy(this.takeoverTo);this.coords_old.copy(this.coords);this.diff.set(0,0);}
          else{const k=t*t*(3-2*t);this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo,k);}
        }
        this.diff.subVectors(this.coords,this.coords_old);
        this.coords_old.copy(this.coords);
        if(!this.coords_old.x&&!this.coords_old.y)this.diff.set(0,0);
        if(this.isAutoActive&&!this.takeoverActive)this.diff.multiplyScalar(this.autoIntensity);
      }
    }
    const Mouse=new MouseClass();

    class AutoDriver {
      constructor(mouse,manager,opts){
        this.mouse=mouse; this.manager=manager; this.enabled=opts.enabled;
        this.speed=opts.speed; this.resumeDelay=opts.resumeDelay||3000;
        this.rampDurationMs=(opts.rampDuration||0)*1000; this.active=false;
        this.current=new THREE.Vector2(); this.target=new THREE.Vector2();
        this.lastTime=performance.now(); this.activationTime=0; this.margin=0.2;
        this._tmpDir=new THREE.Vector2(); this.pickNewTarget();
      }
      pickNewTarget(){const r=Math.random;this.target.set((r()*2-1)*(1-this.margin),(r()*2-1)*(1-this.margin));}
      forceStop(){this.active=false;this.mouse.isAutoActive=false;}
      update(){
        if(!this.enabled)return;
        const now=performance.now(); const idle=now-this.manager.lastUserInteraction;
        if(idle<this.resumeDelay){if(this.active)this.forceStop();return;}
        if(this.mouse.isHoverInside){if(this.active)this.forceStop();return;}
        if(!this.active){this.active=true;this.current.copy(this.mouse.coords);this.lastTime=now;this.activationTime=now;}
        this.mouse.isAutoActive=true;
        let dt=(now-this.lastTime)/1000; this.lastTime=now; if(dt>0.2)dt=0.016;
        const dir=this._tmpDir.subVectors(this.target,this.current); const dist=dir.length();
        if(dist<0.01){this.pickNewTarget();return;} dir.normalize();
        let ramp=1;
        if(this.rampDurationMs>0){const t=Math.min(1,(now-this.activationTime)/this.rampDurationMs);ramp=t*t*(3-2*t);}
        this.current.addScaledVector(dir,Math.min(this.speed*dt*ramp,dist));
        this.mouse.setNormalized(this.current.x,this.current.y);
      }
    }

    const face_vert=`attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
    const line_vert=`attribute vec3 position;uniform vec2 px;precision highp float;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}`;
    const mouse_vert=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
    const advection_frag=`precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 newVel=texture2D(velocity,uv2).xy;gl_FragColor=vec4(newVel,0.0,0.0);}else{vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;vec2 newVel2=texture2D(velocity,spot_old2).xy;gl_FragColor=vec4(newVel2,0.0,0.0);}}`;
    const color_frag=`precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
    const divergence_frag=`precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float divergence=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(divergence/dt);}`;
    const externalForce_frag=`precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
    const poisson_frag=`precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;float newP=(p0+p1+p2+p3)/4.0-div;gl_FragColor=vec4(newP);}`;
    const pressure_frag=`precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float step=1.0;float p0=texture2D(pressure,uv+vec2(px.x*step,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*step,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*step)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*step)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gradP=vec2(p0-p1,p2-p3)*0.5;v=v-gradP*dt;gl_FragColor=vec4(v,0.0,1.0);}`;
    const viscous_frag=`precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 new0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 new1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 new2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 new3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 newv=4.0*old+v*dt*(new0+new1+new2+new3);newv/=4.0*(1.0+v*dt);gl_FragColor=vec4(newv,0.0,0.0);}`;

    class ShaderPass {
      constructor(props){this.props=props||{};this.uniforms=this.props.material?.uniforms;}
      init(){
        this.scene=new THREE.Scene(); this.camera=new THREE.Camera();
        if(this.uniforms){
          this.material=new THREE.RawShaderMaterial(this.props.material);
          this.geometry=new THREE.PlaneGeometry(2,2);
          this.plane=new THREE.Mesh(this.geometry,this.material);
          this.scene.add(this.plane);
        }
      }
      update(){
        Common.renderer.setRenderTarget(this.props.output||null);
        Common.renderer.render(this.scene,this.camera);
        Common.renderer.setRenderTarget(null);
      }
    }

    class Advection extends ShaderPass {
      constructor(p){
        super({material:{vertexShader:face_vert,fragmentShader:advection_frag,uniforms:{boundarySpace:{value:p.cellScale},px:{value:p.cellScale},fboSize:{value:p.fboSize},velocity:{value:p.src.texture},dt:{value:p.dt},isBFECC:{value:true}}},output:p.dst});
        this.init();
        const g=new THREE.BufferGeometry();
        g.setAttribute("position",new THREE.BufferAttribute(new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]),3));
        this.line=new THREE.LineSegments(g,new THREE.RawShaderMaterial({vertexShader:line_vert,fragmentShader:advection_frag,uniforms:this.uniforms}));
        this.scene.add(this.line);
      }
      update({dt,isBounce,BFECC}){this.uniforms.dt.value=dt;this.line.visible=isBounce;this.uniforms.isBFECC.value=BFECC;super.update();}
    }

    class ExternalForce extends ShaderPass {
      constructor(p){super({output:p.dst});this.init();
        this.mouse=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.RawShaderMaterial({vertexShader:mouse_vert,fragmentShader:externalForce_frag,blending:THREE.AdditiveBlending,depthWrite:false,uniforms:{px:{value:p.cellScale},force:{value:new THREE.Vector2()},center:{value:new THREE.Vector2()},scale:{value:new THREE.Vector2(p.cursor_size,p.cursor_size)}}}));
        this.scene.add(this.mouse);
      }
      update(p){
        const u=this.mouse.material.uniforms;
        u.force.value.set((Mouse.diff.x/2)*p.mouse_force,(Mouse.diff.y/2)*p.mouse_force);
        const csX=p.cursor_size*p.cellScale.x; const csY=p.cursor_size*p.cellScale.y;
        u.center.value.set(Math.min(Math.max(Mouse.coords.x,-1+csX+p.cellScale.x*2),1-csX-p.cellScale.x*2),Math.min(Math.max(Mouse.coords.y,-1+csY+p.cellScale.y*2),1-csY-p.cellScale.y*2));
        u.scale.value.set(p.cursor_size,p.cursor_size); super.update();
      }
    }

    class Viscous extends ShaderPass {
      constructor(p){super({material:{vertexShader:face_vert,fragmentShader:viscous_frag,uniforms:{boundarySpace:{value:p.boundarySpace},velocity:{value:p.src.texture},velocity_new:{value:p.dst_.texture},v:{value:p.viscous},px:{value:p.cellScale},dt:{value:p.dt}}},output:p.dst,output0:p.dst_,output1:p.dst});this.init();}
      update({viscous,iterations,dt}){
        this.uniforms.v.value=viscous; let fi,fo;
        for(let i=0;i<iterations;i++){fi=i%2===0?this.props.output0:this.props.output1;fo=i%2===0?this.props.output1:this.props.output0;this.uniforms.velocity_new.value=fi.texture;this.props.output=fo;this.uniforms.dt.value=dt;super.update();}
        return fo;
      }
    }

    class Divergence extends ShaderPass {
      constructor(p){super({material:{vertexShader:face_vert,fragmentShader:divergence_frag,uniforms:{boundarySpace:{value:p.boundarySpace},velocity:{value:p.src.texture},px:{value:p.cellScale},dt:{value:p.dt}}},output:p.dst});this.init();}
      update({vel}){this.uniforms.velocity.value=vel.texture;super.update();}
    }

    class Poisson extends ShaderPass {
      constructor(p){super({material:{vertexShader:face_vert,fragmentShader:poisson_frag,uniforms:{boundarySpace:{value:p.boundarySpace},pressure:{value:p.dst_.texture},divergence:{value:p.src.texture},px:{value:p.cellScale}}},output:p.dst,output0:p.dst_,output1:p.dst});this.init();}
      update({iterations}){
        let pi,po;
        for(let i=0;i<iterations;i++){pi=i%2===0?this.props.output0:this.props.output1;po=i%2===0?this.props.output1:this.props.output0;this.uniforms.pressure.value=pi.texture;this.props.output=po;super.update();}
        return po;
      }
    }

    class Pressure extends ShaderPass {
      constructor(p){super({material:{vertexShader:face_vert,fragmentShader:pressure_frag,uniforms:{boundarySpace:{value:p.boundarySpace},pressure:{value:p.src_p.texture},velocity:{value:p.src_v.texture},px:{value:p.cellScale},dt:{value:p.dt}}},output:p.dst});this.init();}
      update({vel,pressure}){this.uniforms.velocity.value=vel.texture;this.uniforms.pressure.value=pressure.texture;super.update();}
    }

    class Simulation {
      constructor(opts={}){
        this.options={iterations_poisson:32,iterations_viscous:32,mouse_force:20,resolution:0.5,cursor_size:100,viscous:30,isBounce:false,dt:0.014,isViscous:false,BFECC:true,...opts};
        this.fbos={vel_0:null,vel_1:null,vel_viscous0:null,vel_viscous1:null,div:null,pressure_0:null,pressure_1:null};
        this.fboSize=new THREE.Vector2(); this.cellScale=new THREE.Vector2(); this.boundarySpace=new THREE.Vector2();
        this.calcSize(); this.createAllFBO(); this.createShaderPass();
      }
      getFloatType(){return /(iPad|iPhone|iPod)/i.test(navigator.userAgent)?THREE.HalfFloatType:THREE.FloatType;}
      createAllFBO(){
        const opts={type:this.getFloatType(),depthBuffer:false,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping};
        for(const k in this.fbos)this.fbos[k]=new THREE.WebGLRenderTarget(this.fboSize.x,this.fboSize.y,opts);
      }
      createShaderPass(){
        this.advection=new Advection({cellScale:this.cellScale,fboSize:this.fboSize,dt:this.options.dt,src:this.fbos.vel_0,dst:this.fbos.vel_1});
        this.externalForce=new ExternalForce({cellScale:this.cellScale,cursor_size:this.options.cursor_size,dst:this.fbos.vel_1});
        this.viscous=new Viscous({cellScale:this.cellScale,boundarySpace:this.boundarySpace,viscous:this.options.viscous,src:this.fbos.vel_1,dst:this.fbos.vel_viscous1,dst_:this.fbos.vel_viscous0,dt:this.options.dt});
        this.divergence=new Divergence({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.vel_viscous0,dst:this.fbos.div,dt:this.options.dt});
        this.poisson=new Poisson({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.div,dst:this.fbos.pressure_1,dst_:this.fbos.pressure_0});
        this.pressure=new Pressure({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src_p:this.fbos.pressure_0,src_v:this.fbos.vel_viscous0,dst:this.fbos.vel_0,dt:this.options.dt});
      }
      calcSize(){
        this.cellScale.set(1/Math.max(1,Math.round(this.options.resolution*Common.width)),1/Math.max(1,Math.round(this.options.resolution*Common.height)));
        this.fboSize.set(Math.max(1,Math.round(this.options.resolution*Common.width)),Math.max(1,Math.round(this.options.resolution*Common.height)));
      }
      resize(){this.calcSize();for(const k in this.fbos)this.fbos[k].setSize(this.fboSize.x,this.fboSize.y);}
      update(){
        this.boundarySpace.copy(this.options.isBounce?new THREE.Vector2():this.cellScale);
        this.advection.update({dt:this.options.dt,isBounce:this.options.isBounce,BFECC:this.options.BFECC});
        this.externalForce.update({cursor_size:this.options.cursor_size,mouse_force:this.options.mouse_force,cellScale:this.cellScale});
        let vel=this.fbos.vel_1;
        if(this.options.isViscous)vel=this.viscous.update({viscous:this.options.viscous,iterations:this.options.iterations_viscous,dt:this.options.dt});
        this.divergence.update({vel});
        const pressure=this.poisson.update({iterations:this.options.iterations_poisson});
        this.pressure.update({vel,pressure});
      }
    }

    class Output {
      constructor(){
        this.simulation=new Simulation();
        this.scene=new THREE.Scene(); this.camera=new THREE.Camera();
        this.output=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.RawShaderMaterial({vertexShader:face_vert,fragmentShader:color_frag,transparent:true,depthWrite:false,uniforms:{velocity:{value:this.simulation.fbos.vel_0.texture},boundarySpace:{value:new THREE.Vector2()},palette:{value:paletteTex},bgColor:{value:bgVec4}}}));
        this.scene.add(this.output);
      }
      resize(){this.simulation.resize();}
      render(){Common.renderer.setRenderTarget(null);Common.renderer.render(this.scene,this.camera);}
      update(){this.simulation.update();this.render();}
    }

    class WebGLManager {
      constructor(props){
        this.props=props; this.output=null; this.autoDriver=null;
        this.lastUserInteraction=performance.now(); this.running=false;
        Common.init(props.$wrapper);
        Mouse.init(props.$wrapper);
        Mouse.autoIntensity=props.autoIntensity;
        Mouse.takeoverDuration=props.takeoverDuration;
        Mouse.onInteract=()=>{this.lastUserInteraction=performance.now();if(this.autoDriver)this.autoDriver.forceStop();};
        this.autoDriver=new AutoDriver(Mouse,this,{enabled:props.autoDemo,speed:props.autoSpeed,resumeDelay:props.autoResumeDelay,rampDuration:props.autoRampDuration});
        props.$wrapper.prepend(Common.renderer.domElement);
        this.output=new Output();
        this._loop=this.loop.bind(this);
        this._resize=this.resize.bind(this);
        this._onVis=()=>{if(document.hidden){this.pause();}else if(isVisibleRef.current&&!pausedRef.current){this.start();}};
        window.addEventListener("resize",this._resize);
        document.addEventListener("visibilitychange",this._onVis);
      }
      resize(){Common.resize();this.output.resize();}
      render(){if(this.autoDriver)this.autoDriver.update();Mouse.update();Common.update();this.output.update();}
      loop(){if(!this.running)return;const _n=performance.now();if(!this._lft)this._lft=_n;if(_n-this._lft<33){rafRef.current=requestAnimationFrame(this._loop);return;}this._lft=_n;this.render();rafRef.current=requestAnimationFrame(this._loop);}
      start(){if(this.running)return;Mouse.resume();this.running=true;this.loop();}
      pause(){this.running=false;if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null;}Mouse.suspend();}
      dispose(){
        try{
          window.removeEventListener("resize",this._resize);
          document.removeEventListener("visibilitychange",this._onVis);
          Mouse.dispose();
          if(Common.renderer){const c=Common.renderer.domElement;if(c?.parentNode)c.parentNode.removeChild(c);Common.renderer.dispose();Common.renderer.forceContextLoss?.();}
        }catch(_){}
      }
    }

    const container=mountRef.current;
    container.style.position="relative";
    container.style.overflow="hidden";

    const webgl=new WebGLManager({$wrapper:container,autoDemo,autoSpeed,autoIntensity,takeoverDuration,autoResumeDelay,autoRampDuration});
    webglRef.current=webgl;

    const sim=webgl.output?.simulation;
    if(sim)Object.assign(sim.options,{mouse_force:mouseForce,cursor_size:cursorSize,isViscous,viscous,iterations_viscous:iterationsViscous,iterations_poisson:iterationsPoisson,dt,BFECC,resolution,isBounce});

    // Start or stay paused — pause() also suspends mouse listeners so they never
    // fire getBoundingClientRect() when the section is offscreen.
    if(!pausedRef.current){webgl.start();}else{webgl.pause();}

    const ro=new ResizeObserver(()=>{
      if(!webglRef.current)return;
      if(rafRef.current)cancelAnimationFrame(rafRef.current);
      rafRef.current=requestAnimationFrame(()=>{if(webglRef.current)webglRef.current.resize();});
    });
    ro.observe(container);

    return()=>{
      if(rafRef.current)cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      webglRef.current?.dispose();
      webglRef.current=null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);  // ← no deps: setup once; paused is handled by the second effect above

  return(
    <div ref={mountRef} className={`liquid-ether-container ${className}`}
      style={{position:"relative",overflow:"hidden",width:"100%",height:"100%",touchAction:"none",...style}}/>
  );
}
