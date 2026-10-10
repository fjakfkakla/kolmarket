"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** Ce que la scène pilote ; la planète lit cet objet à chaque image. */
export type PlanetState = {
  /** Rotation propre ajoutée par le défilement (radians). */
  spin: number;
  /** Vitesse de rotation propre (radians / s). */
  speed: number;
  /** Inclinaison de l'axe vers le spectateur (radians). */
  tilt: number;
  /** Inclinaison du plan de l'anneau (radians, 0 = vu par la tranche). */
  ringTilt: number;
  /** Opacité de l'anneau, 0..1 */
  ring: number;
  /** Rayon de la planète dans le canvas, 0..1 (1 = bord). */
  radius: number;
  /** Lumière : 0 = de face, 1 = rasante par la gauche. */
  light: number;
  /** Décalage du centre, en demi-côtés du plus petit bord (y vers le haut). */
  x: number;
  y: number;
};

export const defaultPlanet = (): PlanetState => ({ spin: 0, speed: 0.12, tilt: 0.32, ringTilt: 0.28, ring: 1, radius: 0.5, light: 0.4, x: 0, y: 0 });

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 uRes,uOff;uniform float uTime,uSpin,uTilt,uRingTilt,uRing,uR,uLight;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.07+vec3(1.7,9.2,3.1);a*=.5;}return s;}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
void main(){
  float m=min(uRes.x,uRes.y);
  vec2 uv=(gl_FragCoord.xy*2.-uRes)/m-uOff;
  float px=2./m;
  vec3 L=normalize(vec3(mix(-.25,-.85,uLight),mix(.42,.5,uLight),mix(.88,.42,uLight)));
  float R=uR;float r=length(uv);
  vec3 N=rx(uRingTilt)*vec3(0.,1.,0.);
  N=normalize(vec3(N.x+.18*N.y,N.y,N.z));
  float R1=R*1.32,R2=R*2.05;
  /* la planète */
  vec4 pl=vec4(0.);float zS=-9.;
  if(r<R+px*2.){
    float z=sqrt(max(R*R-r*r,0.));zS=z;
    vec3 n=vec3(uv,z)/R;
    vec3 b=ry(uSpin)*rx(-uTilt)*n;
    float w=fbm(b*2.1+vec3(0.,0.,uTime*.015));
    float bands=sin(b.y*12.+w*5.2);
    float st=fbm(b*4.6+w*1.8+vec3(uTime*.01,0.,0.));
    vec3 deep=vec3(.03,.07,.36),royal=vec3(.11,.25,.86),bright=vec3(.35,.5,1.),ice=vec3(.82,.88,1.);
    vec3 c=mix(deep,royal,smoothstep(-.95,.15,bands));
    c=mix(c,bright,smoothstep(.3,.95,bands)*.8);
    c=mix(c,ice,smoothstep(.6,.78,st)*.7);
    float lon=atan(b.x,b.z),lat=asin(clamp(b.y,-1.,1.));
    float g=max(1.-abs(fract(lon*2.8648)-.5)*2./ (fwidth(lon*2.8648)*1.6+.001),0.);
    float g2=max(1.-abs(fract(lat*2.8648)-.5)*2./ (fwidth(lat*2.8648)*1.6+.001),0.);
    float grid=max(g,g2)*.9;
    float ndl=dot(n,L);
    float diff=clamp(ndl*.9+.1,0.,1.);
    vec3 lit=c*(.16+1.*diff);
    vec3 H=normalize(L+vec3(0.,0.,1.));
    lit+=vec3(.85,.9,1.)*pow(max(dot(n,H),0.),48.)*.38;
    float night=1.-smoothstep(-.15,.3,ndl);
    lit+=vec3(.55,.7,1.)*grid*(.10+.32*night);
    float fres=pow(1.-n.z,2.4);
    lit=mix(lit,vec3(.66,.77,1.),fres*.6*(.3+.7*diff));
    /* l'ombre de l'anneau sur la planète */
    vec3 S=vec3(uv,z);float t=-dot(S,N)/dot(L,N);
    if(t>0.){float d=length(S+L*t);float band=smoothstep(R1,R1+.02,d)*(1.-smoothstep(R2-.03,R2,d));lit*=1.-band*.45*uRing;}
    float a=1.-smoothstep(R-px*1.2,R+px*.6,r);
    pl=vec4(lit*a,a);
  }
  /* l'atmosphère : un liseré, pas un halo */
  float atm=0.;
  if(r>R-px){float k=(r-R)/(R*.05);atm=exp(-k*k)*.55*smoothstep(-.4,.6,dot(normalize(vec3(uv,0.)),L)+.3);}
  /* l'anneau */
  vec4 ri=vec4(0.);float zp=-9.;
  if(abs(N.z)>.002){
    zp=-(uv.x*N.x+uv.y*N.y)/N.z;
    vec3 P=vec3(uv,zp);float d=length(P);
    if(d>R1-.01&&d<R2+.01){
      float u=(d-R1)/(R2-R1);
      float rings=.55+.45*sin(u*58.)*sin(u*17.+1.3);
      float gap=smoothstep(.52,.55,u)*(1.-smoothstep(.58,.61,u));
      float edge=smoothstep(0.,.04,u)*(1.-smoothstep(.94,1.,u));
      float al=(.35+.5*rings)*(1.-gap*.85)*edge*uRing;
      vec3 rc=mix(vec3(.72,.8,1.),vec3(1.),rings*.6);
      float sh=1.;float pl2=dot(P,L);
      if(pl2<0.&&length(P-pl2*L)<R)sh=.28;
      rc*=(.55+.45*abs(dot(N,L)))*sh;
      ri=vec4(rc*al,al);
    }
  }
  vec4 col;
  if(zp>zS){col=pl;col=ri+col*(1.-ri.a);}
  else{col=ri;col=pl+col*(1.-pl.a);}
  col.rgb+=vec3(.62,.74,1.)*atm*(1.-col.a);col.a=max(col.a,atm*.9);
  gl_FragColor=col;
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/**
 * La planète des memecoins : un seul shader (sphère + anneau tracés au rayon), sans bibliothèque.
 * Elle ne tourne que visible, s'arrête onglet caché, et se pose en mouvement réduit.
 */
export function Planet({ state, className = "", label = "" }: { state: RefObject<PlanetState>; className?: string; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "high-performance" });
    if (!gl) {
      const id = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(id);
    }
    gl.getExtension("OES_standard_derivatives");
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, "#extension GL_OES_standard_derivatives : enable\n" + FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    } catch (e) {
      console.warn("[planet]", e);
      const id = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(id);
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { res: u("uRes"), time: u("uTime"), spin: u("uSpin"), tilt: u("uTilt"), ringTilt: u("uRingTilt"), ring: u("uRing"), r: u("uR"), light: u("uLight"), off: u("uOff") };
    gl.clearColor(0, 0, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    let elapsed = 0;
    let last = "";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const w = Math.max(2, Math.round(cv.clientWidth * dpr));
      const h = Math.max(2, Math.round(cv.clientHeight * dpr));
      const scale = Math.min(1, 1100 / Math.max(w, h));
      const W = Math.round(w * scale), H = Math.round(h * scale);
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
        last = "";
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      const s = state.current;
      if (!reduced) elapsed += dt;
      const spin = s.spin + elapsed * s.speed;
      const key = `${cv.width}|${spin.toFixed(4)}|${s.tilt.toFixed(4)}|${s.ringTilt.toFixed(4)}|${s.ring.toFixed(3)}|${s.radius.toFixed(4)}|${s.light.toFixed(3)}|${s.x.toFixed(4)}|${s.y.toFixed(4)}`;
      if (key === last) return;
      last = key;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.res, cv.width, cv.height);
      gl.uniform1f(U.time, elapsed);
      gl.uniform1f(U.spin, spin);
      gl.uniform1f(U.tilt, s.tilt);
      gl.uniform1f(U.ringTilt, s.ringTilt);
      gl.uniform1f(U.ring, s.ring);
      gl.uniform1f(U.r, s.radius);
      gl.uniform1f(U.light, s.light);
      gl.uniform2f(U.off, s.x, s.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && document.visibilityState === "visible";
      t0 = performance.now();
    });
    io.observe(cv);
    const onVis = () => {
      visible = document.visibilityState === "visible";
      t0 = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state]);

  if (failed) {
    return (
      <div className={`grid place-items-center ${className}`} role="img" aria-label={label}>
        <div
          className="aspect-square rounded-full"
          style={{
            width: `${(state.current?.radius ?? 0.5) * 100}%`,
            background: "radial-gradient(circle at 34% 30%, #cfe0ff 0%, #4a76ff 22%, #0e3fd0 55%, #0b1d6e 100%)",
            boxShadow: "inset -18px -24px 60px rgba(4,10,50,.55), 0 0 0 2px rgba(169,193,255,.35)",
          }}
        />
      </div>
    );
  }
  return <canvas ref={canvas} className={className} role="img" aria-label={label} />;
}
