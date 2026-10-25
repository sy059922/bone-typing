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

# 2026-10-25 사용자 피드백(구분이 안 됨) 뒤로 한 단계 굵게
BIG, MID, SMALL, CN, CN_S = 0.005, 0.0034, 0.0024, 0.0024, 0.0017

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
        'n_sciatic': (R('Sciatic nerve'), 0.0034),
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

# 맥락 근육·구조물 (m_*) — 신경이 지배하거나 지나가는 길목. 게임에서 신경마다 몇 개만 골라 반투명 빨강으로 보여 준다
MUSCLES = {
    'nerve_upper': {
        'm_scalenes': R('Scalenus anterior muscle', 'Scalenus medius muscle', 'Scalenus posterior muscle'),
        'm_rhomboid': R('Rhomboid major muscle', 'Rhomboid minor muscle'),
        'm_levator_scap': R('Levator scapulae'),
        'm_serratus_ant': R('Serratus anterior muscle'),
        'm_supraspinatus': R('Supraspinatus muscle'),
        'm_infraspinatus': R('Infraspinatus muscle'),
        'm_subclavius': R('Subclavius muscle'),
        'm_pec_major': R('Clavicular head of pectoralis major muscle', 'Sternocostal head of pectoralis major muscle', '(Abdominal part of pectoralis major muscle)'),
        'm_pec_minor': R('Pectoralis minor muscle'),
        'm_subscapularis': R('Subscapularis muscle'),
        'm_teres_major': R('Teres major muscle'),
        'm_teres_minor': R('Teres minor muscle'),
        'm_latissimus': R('Latissimus dorsi muscle'),
        'm_deltoid': R('Clavicular part of deltoid muscle', 'Acromial part of deltoid muscle', 'Scapular spinal part of deltoid muscle'),
        'm_coracobrachialis': R('Coracobrachialis muscle'),
        'm_biceps': R('Long head of biceps brachii', 'Short head of biceps brachii'),
        'm_brachialis': R('Brachialis muscle'),
        'm_triceps': R('Long head of triceps brachii', 'Lateral head of triceps brachii', 'Medial head of triceps brachii'),
        'm_brachioradialis': R('Brachioradialis muscle'),
        'm_ecr': R('Extensor carpi radialis longus', 'Extensor carpi radialis brevis'),
        'm_supinator': R('Supinator'),
        'm_ext_digitorum': R('Extensor digitorum'),
        'm_pronator_teres': R('Deep head of pronator teres', 'Superficial head of pronator teres'),
        'm_fds': R('Humero-ulnar head of flexor digitorum superficialis', 'Radial head of flexor digitorum superficialis'),
        'm_fpl': R('Flexor pollicis longus'),
        'm_fdp': R('Flexor digitorum profundus'),
        'm_pronator_quad': R('Pronator quadratus'),
        'm_fcu': R('Humeral head of flexor carpi ulnaris', 'Ulnar head of flexor carpi ulnaris'),
        'm_flexor_ret': R('Flexor retinaculum of wrist'),
        'm_thenar': R('Abductor pollicis brevis', 'Opponens pollicis muscle', 'Superficial head of flexor pollicis brevis'),
        'm_hypothenar': R('Abductor digiti minimi of hand', 'Flexor digiti minimi of hand', 'Opponens digiti minimi muscle of hand'),
        'm_interossei': R('Dorsal interossei muscles of hand', 'Palmar interossei muscles', 'Oblique head of adductor pollicis', 'Transverse head of adductor pollicis'),
    },
    'nerve_lower': {
        'm_psoas': R('Psoas major'),
        'm_iliacus': R('Iliacus muscle'),
        'm_quadratus_lumb': R('Quadratus lumborum muscle'),
        'm_transversus_abd': R('Transversus abdominis muscle'),
        'm_int_oblique': R('Internal abdominal oblique muscle'),
        'm_inguinal_lig': R('Inguinal ligament'),
        'm_sartorius': R('Sartorius muscle'),
        'm_tfl': R('Tensor fasciae latae'),
        'm_quadriceps': R('Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle', 'Vastus intermedius muscle'),
        'm_vastus_medialis': R('Vastus medialis muscle'),
        'm_adductors': R('Adductor longus', 'Adductor brevis', 'Adductor magnus', 'Gracilis muscle'),
        'm_obt_ext': R('Obturator externus'),
        'm_glut_med': R('Gluteus medius muscle'),
        'm_glut_min': R('Gluteus minimus muscle'),
        'm_glut_max': R('Gluteus maximus muscle'),
        'm_piriformis': R('Piriformis muscle'),
        'm_hamstrings': R('Long head of biceps femoris', 'Short head of biceps femoris', 'Semitendinosus muscle', 'Semimembranosus muscle'),
        'm_biceps_fem': R('Long head of biceps femoris', 'Short head of biceps femoris'),
        'm_obt_int': R('Obturator internus'),
        'm_coccygeus': R('Coccygeus muscle'),
        'm_gastroc': R('Medial head of gastrocnemius', 'Lateral head of gastrocnemius'),
        'm_soleus': R('Soleus muscle'),
        'm_flexor_ret_ankle': R('Flexor retinaculum of ankle'),
        'm_fib_long': R('Fibularis longus muscle'),
        'm_fib_brev': R('Fibularis brevis muscle'),
        'm_tib_ant': R('Tibialis anterior muscle'),
        'm_ehl': R('Extensor hallucis longus'),
        'm_edl': R('Extensor digitorum longus'),
        'm_abd_hallucis': R('Abductor hallucis'),
        'm_fdb': R('Flexor digitorum brevis'),
        'm_abd_dm_foot': R('Abductor digiti minimi of foot'),
        'm_quad_plantae': R('Quadratus plantae muscle'),
    },
    'nerve_spine': {
        'm_intercostals': LR('External intercostal muscles', 'Internal intercostal muscles'),
        'm_psoas': LR('Psoas major'),
    },
    'nerve_head': {
        'm_eye': LR('Sclera', 'Cornea'),
        'm_eom': LR('Superior rectus muscle', 'Inferior rectus muscle', 'Medial rectus muscle', 'Inferior oblique muscle', 'Levator palpebrae superioris'),
        'm_sup_oblique': LR('Superior oblique muscle', 'Trochlea of superior oblique muscle'),
        'm_lat_rectus': LR('Lateral rectus muscle'),
        'm_masseter': LR('Superficial part of masseter', 'Deep part of masseter'),
        'm_temporalis': LR('Temporalis muscle'),
        'm_pterygoids': LR('Medial pterygoid muscle', 'Superior head of lateral pterygoid muscle', 'Inferior head of lateral pterygoid muscle'),
        'm_facial': LR('Orbicularis oris muscle', 'Orbital part of orbicularis oculi', 'Zygomaticus major muscle', 'Frontalis muscle', 'Bucinator'),
        'm_parotid': LR('Parotid gland'),
        'm_tongue': ['Tongue'] + LR('Genioglossus muscle', 'Hyoglossus muscle'),
        'm_mylohyoid': LR('Mylohyoid muscle', 'Anterior belly of digastric muscle'),
        'm_stylopharyngeus': LR('Stylopharyngeus muscle'),
        'm_thyroid': ['Thyroid gland'] + LR('Inferior pharyngeal constrictor'),
        'm_scm': LR('Sternocleidomastoid muscle'),
        'm_trapezius': LR('Descending part of trapezius muscle', 'Transverse part of trapezius muscle'),
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
        # 원본 곡선의 지점별 굵기 배율(좌골신경 최대 12배, 후각망울 5배 …)이 덩어리를 만들어 0.6~1.6 배로 묶음
        for sp in src.data.splines:
            for pt in (sp.bezier_points if sp.type == 'BEZIER' else sp.points):
                pt.radius = min(1.6, max(0.6, pt.radius))
        src.data.bevel_mode = 'ROUND'
        src.data.bevel_depth = radius
        src.data.bevel_resolution = 4
        src.data.use_fill_caps = True
        src.data.bevel_object = None
        deps.update()
    ev = src.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = bpy.data.meshes.new_from_object(ev)
    me.transform(src.matrix_world)
    if src.type == 'CURVE':
        me.shade_smooth()
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
    for node, names in MUSCLES[file].items():
        meshes, missing = [], []
        for n in names:
            o = bpy.data.objects.get(n) or bpy.data.objects.get(re.sub(r'\.r$', '', n))
            if not o or o.type != 'MESH':
                if not n.endswith('.l'):
                    missing.append(n)
                continue
            meshes.append(to_mesh(o, 0))
        if not meshes:
            report.append(f'{file}/{node}: EMPTY {missing}')
            continue
        made.append(join(node, meshes, coll))
        report.append(f'{file}/{node}: muscles {len(meshes)}' + (f'  missing {missing}' if missing else ''))
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
    # 다음 파일에서 같은 이름(b_pelvis, m_psoas …)을 쓸 수 있게 만든 개체를 지움 (안 지우면 '.001' 이 붙음)
    for ob in made:
        bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.collections.remove(coll)

print('\n'.join(report))
