// export_nerves.py 가 만든 신경 GLB → 단순화 + meshopt 압축 (게임용)
// 사용법: node compress_nerves.mjs <입력 폴더> <models 폴더>
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [inDir, outDir] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const NERVE_CAP = 5000; // 신경 노드 하나 최대 삼각형
const BONE_CAP = { b_skull: 16000, b_teeth: 5000, b_ribs: 14000, b_spine: 14000, b_arm: 12000, b_leg: 12000, b_pelvis: 8000, b_axial: 8000 };
const manifestPath = path.join(outDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.remarks = [
  ...(manifest.remarks || []).filter((r) => !r.startsWith('nerve_')),
  'nerve_*.glb come from Z-Anatomy (CC BY-SA 4.0, built on BodyParts3D): nerve curves re-thickened (radius 1.1-3.5 mm) and converted to tube meshes; context bones (nodes "b_*") come from the same Z-Anatomy file so they line up. Nodes "n_*" are nerves. Licensed CC BY-SA 4.0 as adapted material.',
];
for (const f of fs.readdirSync(inDir).filter((x) => /^nerve_.*\.glb$/.test(x))) {
  const doc = await io.read(path.join(inDir, f));
  await doc.transform(weld({ tolerance: 0.00001 }));
  const nodes = {};
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const name = node.getName();
    const cap = name.startsWith('b_') ? BONE_CAP[name] ?? 6000 : NERVE_CAP;
    for (const prim of mesh.listPrimitives()) {
      const before = prim.getIndices().getCount() / 3;
      if (before > cap) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: cap / before, error: name.startsWith('b_') ? 0.01 : 0.003 });
    }
    const p = mesh.listPrimitives()[0];
    const pos = p.getAttribute('POSITION');
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], v = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[k]); max[k] = Math.max(max[k], v[k]); } }
    const r = (x) => Math.round(x * 1e5) / 1e5;
    nodes[name] = { kind: name.startsWith('b_') ? 'bone' : 'nerve', bbox: { min: min.map(r), max: max.map(r) }, triangles: p.getIndices().getCount() / 3 };
  }
  await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizationVolume: 'scene', quantizePosition: 14, quantizeNormal: 10 }));
  const out = path.join(outDir, f);
  await io.write(out, doc);
  const bytes = fs.statSync(out).size;
  manifest.files[f] = { source: 'Z-Anatomy (CC BY-SA 4.0, based on BodyParts3D)', bytes, triangles: Object.values(nodes).reduce((s, n) => s + n.triangles, 0), nodes, missing: [] };
  console.log(f, (bytes / 1024).toFixed(0), 'KB', manifest.files[f].triangles, 'tris');
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2).replace(/\[\s+(-?[\d.e-]+),\s+(-?[\d.e-]+),\s+(-?[\d.e-]+)\s+\]/g, '[$1, $2, $3]') + '\n');
