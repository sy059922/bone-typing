import {ContactShadows, useGLTF} from '@react-three/drei';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import React, {Component, Suspense, useEffect, useMemo, useRef} from 'react';
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
// 근육 모드: 근육은 차분한 붉은 살색, 맥락 뼈는 흐린 흰색
const MUSCLE = new THREE.MeshStandardMaterial({color: '#B5524A', roughness: 0.62, metalness: 0, emissive: '#5A1410', emissiveIntensity: 0.15});
const GHOST_BONE = new THREE.MeshStandardMaterial({color: '#F2EFE8', roughness: 0.8, transparent: true, opacity: 0.22, depthWrite: false});
const BAD = new THREE.MeshStandardMaterial({color: '#E5484D', roughness: 0.55, emissive: '#E5484D', emissiveIntensity: 0.25});

// 자리: 왼쪽(방금 친 뼈) · 가운데(지금 칠 뼈) · 오른쪽(다음 뼈) · gone(왼쪽 밖으로 사라짐)
export type Slot = 'prev' | 'cur' | 'next' | 'gone';
const SIDE_SCALE = 0.5;

// 자리 사이를 부드럽게 미끄러지며 계속 회전. 새로 생긴 '다음 뼈'는 오른쪽 밖에서 들어옴
const Mover: React.FC<{slot: Slot; bad: number; children: React.ReactNode}> = ({slot, bad, children}) => {
  const g = useRef<THREE.Group>(null!);
  const vw = useThree((st) => st.viewport.width);
  const side = Math.min(4.3, vw * 0.36); // 좁은 화면이면 양옆을 안쪽으로
  const started = useRef(false);
  const spin = useRef(0);
  useFrame((st, dt) => {
    const tx = slot === 'prev' ? -side : slot === 'next' ? side : slot === 'gone' ? -side - 6 : 0;
    const ts = slot === 'cur' ? 1 : SIDE_SCALE;
    if (!started.current) {
      started.current = true;
      g.current.position.x = slot === 'cur' ? 7 : tx + 6;
      g.current.scale.setScalar(ts * 0.6);
    }
    const k = 1 - Math.exp(-dt * 7);
    const p = g.current.position;
    p.x += (tx - p.x) * k;
    const s = g.current.scale.x + (ts - g.current.scale.x) * k;
    g.current.scale.setScalar(s);
    // 움직이는 중엔 빨리, 자리 잡으면 천천히 회전
    const moving = Math.min(1, Math.abs(tx - p.x) / 3);
    spin.current = 0.55 + 4 * moving;
    g.current.rotation.y += dt * spin.current;
    const t = st.clock.elapsedTime;
    const shake = bad > 0 ? Math.sin(t * 60) * 0.12 * bad : 0;
    g.current.position.set(p.x + shake * 0.2, Math.sin(t * 1.3 + (slot === 'cur' ? 0 : 1.5)) * 0.06, slot === 'cur' ? 0 : -0.6);
  });
  return <group ref={g}>{children}</group>;
};

const Model: React.FC<{model: ModelRef; bad: boolean; dim: boolean}> = ({model, bad, dim}) => {
  const {scene} = useGLTF(`/models/${model.file}.glb`, false, true);
  const isMuscle = model.file.startsWith('muscle');
  const compact = useThree((st) => st.size.width < 700);
  const bone = useMemo(() => {
    const m = (isMuscle ? MUSCLE : BONE).clone();
    m.transparent = true;
    return m;
  }, [isMuscle]);
  const ghost = useMemo(() => (isMuscle ? GHOST_BONE : GHOST).clone(), [isMuscle]);
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
      const c = new THREE.Mesh(m.geometry, hl.has(n) ? bone : ghost);
      c.userData.hl = hl.has(n);
      c.applyMatrix4(m.matrixWorld);
      c.renderOrder = hl.has(n) ? 1 : 0;
      group.add(c);
    }
    const holder = new THREE.Group();
    holder.add(group);
    group.updateMatrixWorld(true);
    // 근육 모드는 강조할 근육 기준으로 확대 (맥락 뼈는 화면 밖으로 넘어가도 됨)
    const box = new THREE.Box3();
    if (isMuscle || compact) {
      group.children.forEach((c) => c.userData.hl && box.expandByObject(c));
      const grow = box.getSize(new THREE.Vector3()).multiplyScalar(isMuscle ? 0.18 : 0.35);
      box.expandByVector(grow);
    } else box.setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = 3.0 / Math.max(size.x, size.y, size.z * 0.8, 1e-6);
    holder.scale.setScalar(k);
    holder.position.copy(center.multiplyScalar(-k));
    const wrap = new THREE.Group();
    wrap.add(holder);
    return {wrap, count: done.size, hlCount: hl.size};
  }, [scene, model, bone, ghost, isMuscle, compact]);

  built.wrap.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.userData.hl) m.material = bad ? BAD : bone;
  });
  // 옆 자리(이전·다음)는 흐리게 — 불투명도를 천천히 바꿈
  useFrame((st, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    bone.opacity += ((dim ? 0.28 : 1) - bone.opacity) * k;
    bone.depthWrite = bone.opacity > 0.95;
    ghost.opacity += ((dim ? 0.05 : isMuscle ? 0.22 : 0.16) - ghost.opacity) * k;
    if (!isMuscle) bone.emissiveIntensity = 0.02 + 0.015 * Math.sin(st.clock.elapsedTime * 2.4);
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

export type StageItem = {key: string; model: ModelRef; slot: Slot};

// 폰: 무대 높이·폭에 맞춰 카메라 거리 조절 (뼈는 최대 3 단위 크기로 맞춰져 있음)
const CameraFit: React.FC = () => {
  const {camera, size} = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (size.width >= 700) {
      cam.position.set(0, 0.4, 7);
    } else {
      const S = 3.4; // 화면에 담을 크기
      const t = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const aspect = size.width / size.height;
      const z = Math.max(S / t, (S * 1.1) / (t * aspect));
      cam.position.set(0, 0.1, Math.min(z, 9));
    }
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
};

export const BoneStage: React.FC<{items: StageItem[]; bad: boolean; bursts: number[]}> = ({items, bad, bursts}) => (
  <Canvas camera={{position: [0, 0.4, 7], fov: 38}} dpr={[1, 2]} gl={{antialias: true}}>
    <CameraFit />
    <color attach="background" args={['#0D0D0D']} />
    <fog attach="fog" args={['#0D0D0D', 9, 18]} />
    {/* 사진 스튜디오 조명: 위 앞 키라이트 + 옆 보조 + 뒤 테두리 빛 */}
    <hemisphereLight args={['#FFFFFF', '#1A1A1A', 0.55]} />
    <directionalLight position={[3, 6, 5]} intensity={2.4} color="#FFFFFF" />
    <directionalLight position={[-5, 1, 2]} intensity={0.6} color="#FFFFFF" />
    <directionalLight position={[0, 3, -6]} intensity={1.6} color="#FFFFFF" />
    <ContactShadows position={[0, -1.75, 0]} opacity={0.55} scale={10} blur={2.6} far={4} color="#000000" />
    {items.map((it) => (
      <Mover key={it.key} slot={it.slot} bad={bad && it.slot === 'cur' ? 1 : 0}>
        <Boundary resetKey={it.key}>
          <Suspense fallback={<Placeholder />}>
            <Model model={it.model} bad={bad && it.slot === 'cur'} dim={it.slot !== 'cur'} />
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

// 앱 아이콘 렌더용 (?icon): 손뼈를 손가락이 위로 오게 세워 살짝 기울임 — '안녕' 하고 흔드는 손
export const IconStage: React.FC<{model: ModelRef}> = ({model}) => (
  <Canvas camera={{position: [0, 0.05, 5.7], fov: 38}} dpr={1} gl={{antialias: true, preserveDrawingBuffer: true}}>
    <color attach="background" args={['#0D0D0D']} />
    <hemisphereLight args={['#FFFFFF', '#1A1A1A', 0.6]} />
    <directionalLight position={[2, 4, 6]} intensity={2.6} color="#FFFFFF" />
    <directionalLight position={[-4, 1, 2]} intensity={0.7} color="#FFFFFF" />
    <directionalLight position={[0, 3, -6]} intensity={1.4} color="#FFFFFF" />
    <group rotation={[0, 0, Math.PI - 0.2]}>
      <Suspense fallback={null}>
        <Model model={model} bad={false} dim={false} />
      </Suspense>
    </group>
  </Canvas>
);
