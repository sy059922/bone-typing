import {ContactShadows, useGLTF} from '@react-three/drei';
import {Canvas, useFrame} from '@react-three/fiber';
import React, {Component, Suspense, useMemo, useRef} from 'react';
import * as THREE from 'three';
import type {ModelRef} from '../data/bones';

// 파일에 없는 이름은 대신 쓸 이름으로
const ALIAS: Record<string, string[]> = {
  hip_r: ['ilium_r', 'ischium_r', 'pubis_r'],
  hip_l: ['ilium_l', 'ischium_l', 'pubis_l'],
};

const resolve = (names: string[], has: (n: string) => boolean) =>
  names.flatMap((n) => (has(n) ? [n] : (ALIAS[n] ?? []).filter(has)));

// BodyParts3D 관골은 한 덩어리 → 삼각형 중심 위치로 장골·좌골·치골을 나눔 (근사)
// 위쪽(+Y) 40% 아래 = 비구 높이 아래. 그 위는 장골, 아래 앞쪽(+Z)은 치골, 아래 뒤쪽은 좌골
const splitHip = (m: THREE.Mesh) => {
  const g = m.geometry;
  const pos = g.attributes.position;
  const idx = g.index;
  const v = new THREE.Vector3();
  const world = (i: number) => v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone();
  const box = new THREE.Box3().setFromObject(m);
  const yCut = box.min.y + 0.4 * (box.max.y - box.min.y);
  const n = idx ? idx.count / 3 : pos.count / 3;
  const tri = (k: number) => [0, 1, 2].map((j) => (idx ? idx.getX(k * 3 + j) : k * 3 + j));
  const cents: THREE.Vector3[] = [];
  const lowZ: number[] = [];
  for (let k = 0; k < n; k++) {
    const c = tri(k).reduce((acc, i) => acc.add(world(i)), new THREE.Vector3()).divideScalar(3);
    cents.push(c);
    if (c.y <= yCut) lowZ.push(c.z);
  }
  lowZ.sort((a, b) => a - b);
  const zCut = lowZ[Math.floor(lowZ.length * 0.5)] ?? box.getCenter(new THREE.Vector3()).z;
  const parts: Record<string, number[]> = {ilium: [], ischium: [], pubis: []};
  cents.forEach((c, k) => parts[c.y > yCut ? 'ilium' : c.z > zCut ? 'pubis' : 'ischium'].push(...tri(k)));
  const out: Record<string, THREE.Mesh> = {};
  for (const [name, list] of Object.entries(parts)) {
    const geo = new THREE.BufferGeometry();
    for (const [k, attr] of Object.entries(g.attributes)) geo.setAttribute(k, attr);
    geo.setIndex(list);
    const mesh = new THREE.Mesh(geo, m.material);
    mesh.matrixWorld.copy(m.matrixWorld);
    out[name] = mesh;
  }
  return out;
};

const BONE = new THREE.MeshStandardMaterial({color: '#F7F5F0', roughness: 0.55, metalness: 0, emissive: '#FFFFFF', emissiveIntensity: 0.02});
const GHOST = new THREE.MeshStandardMaterial({color: '#8C8C8C', roughness: 0.8, transparent: true, opacity: 0.16, depthWrite: false});
const BAD = new THREE.MeshStandardMaterial({color: '#E5484D', roughness: 0.55, emissive: '#E5484D', emissiveIntensity: 0.25});

export type Phase = 'enter' | 'idle' | 'exit';

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const backOut = (t: number) => {
  const c1 = 1.4;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// 날아와서 → 중앙에서 회전 → (맞히면) 왼쪽으로 튕겨 나감
const Mover: React.FC<{phase: Phase; bad: number; children: React.ReactNode}> = ({phase, bad, children}) => {
  const g = useRef<THREE.Group>(null!);
  const t0 = useRef<number | null>(null);
  const exitAt = useRef<number | null>(null);
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const e = Math.min(1, (t - t0.current) / 0.75);
    let x = 7 * (1 - backOut(e));
    let s = 0.6 + 0.4 * ease(e);
    if (phase === 'exit') {
      if (exitAt.current === null) exitAt.current = t;
      const k = Math.min(1, (t - exitAt.current) / 0.45);
      x = -9 * ease(k);
      s = 1 + 0.4 * k;
      g.current.rotation.y += dt * 14;
    } else {
      g.current.rotation.y += dt * (0.55 + 3.5 * (1 - e));
    }
    const shake = bad > 0 ? Math.sin(t * 60) * 0.12 * bad : 0;
    g.current.position.set(x + shake, Math.sin(t * 1.3) * 0.06, 0);
    g.current.scale.setScalar(s);
  });
  return <group ref={g}>{children}</group>;
};

const Model: React.FC<{model: ModelRef; bad: boolean}> = ({model, bad}) => {
  const {scene} = useGLTF(`/models/${model.file}.glb`, false, true);
  const built = useMemo(() => {
    const meshes = new Map<string, THREE.Mesh>();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        // 노드 이름 또는 부모 이름으로 찾기
        const n = o.name || o.parent?.name || '';
        meshes.set(n, o as THREE.Mesh);
        if (o.parent?.name) meshes.set(o.parent.name, o as THREE.Mesh);
      }
    });
    for (const side of ['r', 'l']) {
      const hip = meshes.get(`hip_${side}`);
      const want = [...model.hl, ...(model.show ?? [])].some((n) => /^(ilium|ischium|pubis)_/.test(n));
      if (hip && want && !meshes.has(`ilium_${side}`)) {
        const parts = splitHip(hip);
        for (const [k, mesh] of Object.entries(parts)) meshes.set(`${k}_${side}`, mesh);
      }
    }
    const has = (n: string) => meshes.has(n);
    const hl = new Set(resolve(model.hl, has));
    const show = resolve(model.show ?? model.hl, has);
    hl.forEach((n) => show.includes(n) || show.push(n));
    const group = new THREE.Group();
    const done = new Set<THREE.Mesh>();
    for (const n of show) {
      const m = meshes.get(n)!;
      if (done.has(m)) continue;
      done.add(m);
      const c = new THREE.Mesh(m.geometry, hl.has(n) ? BONE : GHOST);
      c.userData.hl = hl.has(n);
      c.applyMatrix4(m.matrixWorld);
      c.renderOrder = hl.has(n) ? 1 : 0;
      group.add(c);
    }
    const holder = new THREE.Group();
    holder.add(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = 3.0 / Math.max(size.x, size.y, size.z * 0.8, 1e-6);
    holder.scale.setScalar(k);
    holder.position.copy(center.multiplyScalar(-k));
    const wrap = new THREE.Group();
    wrap.add(holder);
    return {wrap, count: done.size, hlCount: hl.size};
  }, [scene, model]);

  built.wrap.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.userData.hl) m.material = bad ? BAD : BONE;
  });
  useFrame((st) => {
    BONE.emissiveIntensity = 0.02 + 0.015 * Math.sin(st.clock.elapsedTime * 2.4);
  });
  if (built.count === 0) return <Placeholder />;
  return <primitive object={built.wrap} />;
};

const Placeholder: React.FC = () => (
  <mesh>
    <capsuleGeometry args={[0.35, 2.2, 8, 24]} />
    <meshStandardMaterial color="#F7F5F0" roughness={0.55} />
  </mesh>
);

class Boundary extends Component<{children: React.ReactNode; resetKey: string}, {err: boolean}> {
  state = {err: false};
  static getDerivedStateFromError() {
    return {err: true};
  }
  componentDidUpdate(p: {resetKey: string}) {
    if (p.resetKey !== this.props.resetKey && this.state.err) this.setState({err: false});
  }
  render() {
    return this.state.err ? <Placeholder /> : this.props.children;
  }
}

// 맞혔을 때 터지는 빛 조각
const Burst: React.FC<{at: number}> = ({at}) => {
  const pts = useRef<THREE.Points>(null!);
  const N = 160;
  const {geo, vel} = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const vel = Array.from({length: N}, () => new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 4));
    return {geo, vel};
  }, []);
  const start = useRef<number | null>(null);
  useFrame((st) => {
    if (start.current === null) start.current = st.clock.elapsedTime;
    const t = st.clock.elapsedTime - start.current;
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) p.setXYZ(i, vel[i].x * t, vel[i].y * t - 2 * t * t, vel[i].z * t);
    p.needsUpdate = true;
    (pts.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - t / 0.9);
  });
  return (
    <points ref={pts} geometry={geo} key={at}>
      <pointsMaterial color="#FFFFFF" size={0.06} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

export type StageItem = {key: string; model: ModelRef; phase: Phase};

export const BoneStage: React.FC<{items: StageItem[]; bad: boolean; bursts: number[]}> = ({items, bad, bursts}) => (
  <Canvas camera={{position: [0, 0.4, 7], fov: 38}} dpr={[1, 2]} gl={{antialias: true}}>
    <color attach="background" args={['#0D0D0D']} />
    <fog attach="fog" args={['#0D0D0D', 9, 18]} />
    {/* 사진 스튜디오 조명: 위 앞 키라이트 + 옆 보조 + 뒤 테두리 빛 */}
    <hemisphereLight args={['#FFFFFF', '#1A1A1A', 0.55]} />
    <directionalLight position={[3, 6, 5]} intensity={2.4} color="#FFFFFF" />
    <directionalLight position={[-5, 1, 2]} intensity={0.6} color="#FFFFFF" />
    <directionalLight position={[0, 3, -6]} intensity={1.6} color="#FFFFFF" />
    <ContactShadows position={[0, -1.75, 0]} opacity={0.55} scale={10} blur={2.6} far={4} color="#000000" />
    {items.map((it) => (
      <Mover key={it.key} phase={it.phase} bad={bad && it.phase !== 'exit' ? 1 : 0}>
        <Boundary resetKey={it.key}>
          <Suspense fallback={<Placeholder />}>
            <Model model={it.model} bad={bad && it.phase !== 'exit'} />
          </Suspense>
        </Boundary>
      </Mover>
    ))}
    {bursts.map((b) => (
      <Burst key={b} at={b} />
    ))}
  </Canvas>
);

export const preloadModels = (files: string[]) => files.forEach((f) => useGLTF.preload(`/models/${f}.glb`, false, true));
