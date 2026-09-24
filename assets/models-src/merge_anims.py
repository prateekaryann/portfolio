import bpy, os, sys, math
SRC = os.path.expanduser('~/Projects/portfolio/assets/models-src')
OUT = os.path.join(SRC, 'prateek-raw.glb')
CLIPS = {  # file -> clip name
    'Sitting Idle.fbx': 'sitting_idle',
    'Typing.fbx': 'typing',
    'Talking.fbx': 'talking',
    'Stand To Sit.fbx': 'stand_to_sit',
    'Sit To Stand.fbx': 'sit_to_stand',
}

def channelbags(act):
    return [cb for layer in act.layers for strip in layer.strips for cb in strip.channelbags]
def fcurves_of(act):
    return [fc for cb in channelbags(act) for fc in cb.fcurves]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'prateek-tpose.glb'), bone_heuristic='BLENDER')
avatar = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
avatar.name = 'Armature'
# prune stray helper
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'):
        bpy.data.objects.remove(o, do_unlink=True)
avatar_bones = set(b.name for b in avatar.data.bones)
print('AVATAR bones', len(avatar_bones))

if avatar.animation_data is None:
    avatar.animation_data_create()

for fname, clip in CLIPS.items():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, 'anim', fname), ignore_leaf_bones=True, automatic_bone_orientation=False)
    new = [o for o in bpy.data.objects if o not in before]
    src_arm = [o for o in new if o.type == 'ARMATURE'][0]
    act = src_arm.animation_data.action
    act.name = clip
    # report hips translation magnitude to catch cm/m scale issues
    hips_loc = [fc for fc in fcurves_of(act) if fc.data_path == 'pose.bones["Hips"].location']
    mx = max((abs(k.co[1]) for fc in hips_loc for k in fc.keyframe_points), default=0)
    missing = set(fc.data_path.split('"')[1] for fc in fcurves_of(act) if '"' in fc.data_path) - avatar_bones
    print(f'CLIP {clip}: frames {act.frame_range[:]}, src_scale {src_arm.scale[:]}, hips_loc_max {mx:.3f}, unmatched_bones {sorted(missing)}')
    # drop fcurves for bones avatar lacks
    for cb in channelbags(act):
        for fc in list(cb.fcurves):
            if '"' in fc.data_path and fc.data_path.split('"')[1] not in avatar_bones:
                cb.fcurves.remove(fc)
    # push onto avatar as NLA track (exporter reads NLA tracks as separate clips)
    tr = avatar.animation_data.nla_tracks.new(); tr.name = clip
    st = tr.strips.new(clip, int(act.frame_range[0]), act); st.name = clip
    if hasattr(st,'action_slot') and act.slots: st.action_slot = act.slots[0]
    act.use_fake_user = True
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)

avatar.animation_data.action = None
# export
bpy.ops.object.select_all(action='DESELECT')
avatar.select_set(True)
for c in avatar.children: c.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_nla_strips_merged_animation_name='',
    export_force_sampling=True, export_optimize_animation_size=True,
    export_morph=True, export_skins=True, export_yup=True, export_apply=False,
    export_image_format='AUTO', export_texcoords=True, export_normals=True,
)
print('WROTE', OUT, os.path.getsize(OUT)//1024, 'KB')
