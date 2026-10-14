"""Build a static, modular 3D wardrobe doll; no skeletal animation or billboards.

Run with the project's portable Blender: blender -b --python this_file.py
Garments and accessories are solid meshes constructed by WardrobeModel.ts.
"""
from pathlib import Path
import bpy
from mathutils import Vector

source = Path(__file__).with_name('build-avatar-3d.py')
namespace = {'__file__': str(source)}
# Reuse the original sculpt, stopping before clothing, binding and motion clips.
exec(compile(source.read_text(encoding='utf-8').split('# Cafe couture follows')[0], str(source), 'exec'), namespace)

eye_names = ['Eye ivory', 'Amber iris rim', 'Amber iris', 'Deep glossy pupil',
             'Large eye catchlight', 'Small eye catchlight', 'Soft upper lashes', 'Outer eyelash']
groups = {}
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    # Static rest geometry cannot develop skinning spikes during a turn.
    if obj.data.shape_keys:
        obj.shape_key_clear()
    world = obj.matrix_world.copy()
    inverse = world.inverted()
    points = [world @ v.co for v in obj.data.vertices]
    center = sum(points, Vector()) / len(points)
    is_eye = any(obj.name.startswith(name) for name in eye_names)
    if obj.name.startswith('Eyelid'):
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    for v, point in zip(obj.data.vertices, points):
        if is_eye:
            # Smaller, softly embedded eyes with less glassy projection.
            x = .236 if center.x > 0 else -.236
            point.x = x + (point.x - x) * .9
            point.z = 2.555 + (point.z - 2.555) * .9
            point.y = namespace['face_y'](point.x, point.z) - .009 + (point.y + .46) * .5
        point.z = .09 + (point.z - .09) * .78 if point.z < 2.02 else point.z - .4246
        if obj.name != 'Continuous body skin':
            point.z -= .08
        v.co = inverse @ point
    mat = obj.data.materials[0]
    mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .52 if is_eye else .65
    if obj.name == 'Continuous body skin':
        category = 'body'
    elif is_eye:
        category = 'eye-' + ('left' if center.x > 0 else 'right') + '-' + mat.name
    elif obj.name.startswith(('Sculpted bob', 'Soft bob', 'Swept fringe')):
        category = 'hair-' + mat.name
    elif obj.name.startswith(('Petal smile', 'Lower lip')):
        category = 'mouth-' + mat.name
    else:
        category = 'head-' + mat.name
    groups.setdefault(category, []).append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

for name, objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    bpy.context.object.name = name

output = Path('public/models/wardrobe')
output.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output / 'doll.glb'), export_format='GLB',
                          export_animations=False, export_skins=False, export_yup=True)
print('WARDROBE_MODEL_READY', sum(len(o.data.vertices) for o in bpy.context.scene.objects if o.type == 'MESH'))
