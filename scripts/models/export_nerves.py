# Z-Anatomy (CC BY-SA 4.0, BodyParts3D 기반) Blender 파일 → 신경 모드용 GLB 4개
#
# 사용법:
#   Blender -b <Z-Anatomy/Startup.blend> --factory-startup -P export_nerves.py -- <출력 폴더>
#   node compress_nerves.mjs <출력 폴더> ../../public/models   # meshopt 압축 + 단순화
#
# 원본: https://github.com/Z-Anatomy/Models-of-human-anatomy (Z-Anatomy.zip → Startup.blend)
# 신경은 Blender 곡선(관 두께 0.5 mm)이라 게임에서 보이게 굵기를 다시 주고(굵은 줄기 3.5 mm ~ 가는 가지 1.1 mm 반지름) 메시로 바꾼다.
# 맥락 뼈도 같은 파일의 뼈를 써서 위치가 정확히 맞는다. 좌표: Blender Z 위 · −Y 앞 · −X 오른쪽 (m) → glTF 내보내기에서 Y 위 · +Z 앞
# 노드 이름 = 게임에서 쓰는 이름 (n_* 신경, b_* 맥락 뼈)

import bpy, sys, re, os

OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)

BIG, MID, SMALL, CN, CN_S = 0.0035, 0.0022, 0.0014, 0.0016, 0.0011

def R(*names):  # 오른쪽 (.r) — 이름 끝에 접미사가 없는 것도 찾음
    return [n + '.r' for n in names]
def LR(*names):
    return [n + s for n in names for s in ('.r', '.l')]

NERVES = {
    'nerve_upper': {
        'n_roots': (R('Roots of brachial plexus'), MID),
        'n_sup_trunk': (R('Superior trunk of brachial plexus', 'Anterior division of superior trunk of brachial plexus', 'Posterior division of superior trunk of brachial plexus'), MID),
        'n_mid_trunk': (R('Middle trunk of brachial plexus', 'Anterior division of middle trunk of brachial plexus', 'Posterior division of middle trunk of brachial plexus'), MID),
        'n_inf_trunk': (R('Inferior trunk of brachial plexus', 'Anterior division of inferior trunk of brachial plexus', 'Posterior division of inferior trunk of brachial plexus'), MID),
        'n_post_cord': (R('Posterior cord of brachial plexus'), MID),
        'n_dorsal_scapular': (R('Dorsal scapular nerve'), SMALL),
        'n_long_thoracic': (R('Long thoracic nerve'), SMALL),
        'n_suprascapular': (R('Suprascapular nerve'), SMALL),
        'n_subclavius': (R('Subclavian nerve'), SMALL),
        'n_lat_pectoral': (R('Lateral pectoral nerve'), SMALL),
        'n_med_pectoral': (R('Medial pectoral nerve'), SMALL),
        'n_upper_subscap': (R('Superior subscapular nerve'), SMALL),
        'n_lower_subscap': (R('Inferior subscapular nerve'), SMALL),
        'n_thoracodorsal': (R('Thoracodorsal nerve'), SMALL),
        'n_axillary': (R('Axillary nerve', 'Muscular branches of axillary nerve', 'Superior lateral brachial cutaneous nerve'), MID),
        'n_musculocutaneous': (R('Musculocutaneous nerve'), MID),
        'n_radial': (R('Radial nerve', 'Muscular branches of radial nerve', 'Inferior lateral brachial cutaneous nerve'), MID),
        'n_pin': (R('Deep branch of radial nerve', 'Posterior interosseous nerve of forearm'), SMALL),
        'n_sup_radial': (R('Superficial branch of radial nerve', 'Dorsal digital branches of radial nerve'), SMALL),
        'n_median': (R('Median nerve', 'Muscular branches of median nerve', 'Palmar branch of median nerve', 'Common palmar digital branches of median nerve', 'Proper palmar digital branches of median nerve', '(Communicating branch of median nerve with ulnar nerve)'), MID),
        'n_ain': (R('Anterior interosseous nerve of forearm'), SMALL),
        'n_ulnar': (R('Ulnar nerve', 'Muscular branches of ulnar nerve', 'Palmar branch of ulnar nerve', 'Superficial branch of ulnar nerve', 'Common palmar digital branches of ulnar nerve', 'Proper palmar digital branches of ulnar nerve'), MID),
        'n_deep_ulnar': (R('Deep branch of ulnar nerve'), SMALL),
        'n_dorsal_ulnar': (R('Dorsal branch of ulnar nerve', 'Dorsal digital branches of ulnar nerve'), SMALL),
        'n_mbcn': (R('Medial brachial cutaneous nerve'), SMALL),
        'n_mabcn': (R('Medial antebrachial cutaneous nerve', 'Anterior branch of medial antebrachial cutaneous nerve', 'Posterior branch of medial antebrachial cutaneous nerve'), SMALL),
        'n_labcn': (R('Lateral antebrachial cutaneous nerve'), SMALL),
        'n_pabcn': (R('Posterior antebrachial cutaneous nerve'), SMALL),
    },
    'nerve_lower': {
        'n_iliohypogastric': (R('Iliohypogastric nerve'), SMALL),
        'n_ilioinguinal': (R('Ilio-inguinal nerve'), SMALL),
        'n_genitofemoral': (R('Genitofemoral nerve', 'Femoral branch of genitofemoral nerve', 'Genital branch of genitofemoral nerve'), SMALL),
        'n_lfcn': (R('Lateral femoral cutaneous nerve'), MID),
        'n_femoral': (R('Femoral nerve', 'Anterior cutaneous branches of femoral nerve'), BIG),
        'n_saphenous': (R('Saphenous nerve', 'Infrapatellar branch of saphenous nerve', 'Medial crural cutaneous branches of saphenous nerve'), MID),
        'n_obturator': (R('Obturator nerve', 'Anterior branch of obturator nerve', 'Posterior branch of obturator nerve'), MID),
        'n_sup_gluteal': (R('Superior gluteal nerve'), MID),
        'n_sciatic': (R('Sciatic nerve'), 0.0015),  # 원본 곡선 자체가 굵게 잡혀 있어 반지름을 줄임
        'n_pfcn': (R('Posterior femoral cutaneous nerve', 'Anterior root of posterior femoral cutaneous nerve', 'Posterior root of posterior femoral cutaneous nerve'), MID),
        'n_pudendal': (R('Pudendal nerve'), MID),
        'n_tibial': (R('Tibial nerve'), BIG),
        'n_cfn': (R('Common fibular nerve', 'Sural communicating branch of common fibular nerve'), BIG),
        'n_sfn': (R('Superficial fibular nerve', 'Dorsal digital branches of superficial fibular nerve', 'Intermediate dorsal cutaneous nerve of foot', 'Medial dorsal cutaneous nerve of foot'), MID),
        'n_dfn': (R('Deep fibular nerve', 'Muscular branches of deep fibular nerve', 'Dorsal digital branches of deep fibular nerve'), MID),
        'n_sural': (R('Sural nerve', 'Medial sural cutaneous nerve'), MID),
        'n_mpn': (R('Medial plantar nerve', 'Common plantar digital branches of medial plantar nerve', 'Proper plantar digital branches of medial plantar nerve'), MID),
        'n_lpn': (R('Lateral plantar nerve', 'Common plantar digital branches of lateral plantar nerve', 'Proper plantar digital branches of lateral plantar nerve'), MID),
    },
    'nerve_spine': {
        'n_cord': (['White matter of spinal cord'], 0),
        'n_cauda': (['Cauda equina'], 0.0009),
        'n_ant_root': (LR('Anterior root of spinal nerve'), SMALL),
        'n_post_root': (LR('Posterior root of spinal nerve'), SMALL),
        'n_drg': (LR('Spinal ganglion'), 0),
        'n_intercostal': (LR('Intercostal nerves'), SMALL),
    },
    'nerve_head': {
        'n_olfactory': (LR('Olfactory nerve (I)'), CN),
        'n_optic': (LR('Optic nerve (II)', 'Optic chiasm', 'Optic tract'), 0.002),
        'n_oculomotor': (LR('Oculomotor nerve (III)'), CN),
        'n_trochlear': (LR('Trochlear nerve (IV)'), CN_S),
        'n_trigeminal': (LR('Trigeminal nerve (V)', 'Motor root of trigeminal nerve', 'Sensory root of trigeminal nerve'), 0.0022),
        'n_ophthalmic': (LR('Ophthalmic nerve'), CN_S),
        'n_maxillary': (LR('Maxillary nerve', 'Meningeal branch of maxillary nerve'), CN),
        'n_mandibular': (LR('Anterior division of mandibular nerve', 'Posterior division of mandibular nerve', 'Buccal nerve'), CN),
        'n_ian': (LR('Inferior alveolar nerve', 'Mental nerve', 'Nerve to mylohyoid muscle'), CN_S),
        'n_lingual': (LR('Lingual nerve'), CN_S),
        'n_abducens': (LR('Abducens nerve (VI)'), CN_S),
        'n_facial': (LR('Facial nerve (VII)', 'Chorda tympani'), CN),
        'n_vestibulocochlear': (LR('Vestibulocochlear nerve (VIII)', 'Vestibular nerve') + ['Cochlear nerve', 'Cochlear nerve.l'], CN),
        'n_glossopharyngeal': (LR('Glossopharyngeal nerve (IX)'), CN_S),
        'n_vagus': (LR('Vagus nerve (X)'), CN),
        'n_accessory': (LR('Accessory nerve (XI)'), CN),
        'n_hypoglossal': (LR('Hypoglossal nerve (XII)'), CN),
    },
}

# 맥락 뼈 (흐리게) — 이름 정규식으로 고름
HAND_R = r'(phalanx of .* finger of hand|metacarpal bone|Capitate|Hamate|Lunate|Pisiform|Scaphoid|Trapezium|Trapezoid|Triquetrum) ?.*\.r$'
FOOT_R = r'(finger of foot|metatarsal bone|Talus|Calcaneus|Navicular bone|Cuboid bone|cuneiform bone|Sesamoid bones of foot)\.r$'
SKULL = r'^(Parietal bone|Frontal bone|Occipital bone|Sphenoid bone|Temporal bone|Ethmoid bone|Inferior nasal concha bone|Lacrimal bone|Nasal bone|Maxilla|Palatine bone|Zygomatic bone|Vomer)(\.r|\.l)?$'
TEETH = r'^(Upper|Lower) .*(incisor|canine|premolar|molar tooth)\.(r|l)$'
BONES = {
    'nerve_upper': {
        'b_arm': r'^(Clavicle|Scapula|Humerus|Radius|Ulna)\.r$|' + HAND_R,
        'b_axial': r'^(Vertebra C[3-7]|Vertebra T[1-4]|Atlas \(C1\)|Axis \(C2\)|First rib\.r|Second rib\.r|Third rib\.r|Manubrium of sternum)$',
    },
    'nerve_lower': {
        'b_pelvis': r'^(Hip bone\.(r|l)|Sacrum|Coccyx|Vertebra L[1-5])$',
        'b_leg': r'^(Femur|Patella|Tibia|Fibula)\.r$|' + FOOT_R,
    },
    'nerve_spine': {
        'b_spine': r'^(Atlas \(C1\)|Axis \(C2\)|Vertebra [CTL]\d+|Sacrum|Coccyx)$',
        'b_ribs': r'^(\w+ rib\.(r|l)|Manubrium of sternum|Body of sternum|Xiphoid process|Costal cartilage of \w+ rib\.(r|l))$',
        'b_pelvis': r'^Hip bone\.(r|l)$',
    },
    'nerve_head': {
        'b_skull': SKULL,
        'b_mandible': r'^Mandible$',
        'b_teeth': TEETH,
        'b_hyoid': r'^Hyoid bone$',
        'b_cervical': r'^(Atlas \(C1\)|Axis \(C2\)|Vertebra C[3-5])$',
    },
}

sk = bpy.data.collections['1: Skeletal system']
deps = bpy.context.evaluated_depsgraph_get()
report = []


def to_mesh(src, radius):
    """원본 개체 → 세계 좌표가 적용된 새 메시 데이터"""
    if src.type == 'CURVE':
        src.data.bevel_mode = 'ROUND'
        src.data.bevel_depth = radius
        src.data.bevel_resolution = 2
        src.data.use_fill_caps = True
        src.data.bevel_object = None
        deps.update()
    ev = src.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = bpy.data.meshes.new_from_object(ev)
    me.transform(src.matrix_world)
    return me


def join(name, meshes, coll):
    import bmesh
    bm = bmesh.new()
    for me in meshes:
        bm.from_mesh(me)
    out = bpy.data.meshes.new(name)
    bm.to_mesh(out)
    bm.free()
    ob = bpy.data.objects.new(name, out)
    coll.objects.link(ob)
    return ob


for file, nodes in NERVES.items():
    coll = bpy.data.collections.new('EXPORT_' + file)
    bpy.context.scene.collection.children.link(coll)
    made = []
    for node, (names, radius) in nodes.items():
        meshes, missing = [], []
        for n in names:
            o = bpy.data.objects.get(n) or bpy.data.objects.get(re.sub(r'\.r$', '', n))
            if not o or o.type not in ('CURVE', 'MESH'):
                if not n.endswith('.l'):
                    missing.append(n)
                continue
            meshes.append(to_mesh(o, radius))
        if not meshes:
            report.append(f'{file}/{node}: EMPTY {missing}')
            continue
        ob = join(node, meshes, coll)
        made.append(ob)
        report.append(f'{file}/{node}: parts {len(meshes)} tris~{sum(len(p.vertices) - 2 for p in ob.data.polygons)}' + (f'  missing {missing}' if missing else ''))
    for node, pat in BONES[file].items():
        rx = re.compile(pat)
        srcs = [o for o in sk.objects if o.type == 'MESH' and rx.search(o.name)]
        ob = join(node, [to_mesh(o, 0) for o in srcs], coll)
        made.append(ob)
        report.append(f'{file}/{node}: bones {len(srcs)}')
    bpy.ops.object.select_all(action='DESELECT')
    for ob in made:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = made[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, file + '.glb'), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='NONE', export_normals=True, export_texcoords=False)
    bpy.data.collections.remove(coll)

print('\n'.join(report))
