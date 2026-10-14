"""Original, reproducible chibi doll. Run with Blender 4.5 in background mode.

blender -b --python scripts/build-avatar-3d.py -- --output public/models/avatar-prototype
No downloaded meshes, textures, or licensed character assets are used.
"""
import bpy
import math
import json
import os
import sys
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from avatar_cafe_details import build_cafe_outfit, painted_iris, painted_hair, iris_uv

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
output = os.path.abspath(args[args.index('--output') + 1] if '--output' in args else 'public/models/avatar-prototype')
os.makedirs(output, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.fps = 30

def material(name, color, roughness=.48, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return m

skin = material('Peach porcelain', (.81, .49, .35), .43)
hair = material('Chestnut silk', (.085, .03, .016), .38)
hair_light = material('Chestnut ribbons', (.112, .044, .021), .4)
cream = material('Vanilla dress', (.86, .77, .59), .72)
lace = material('Milk lace', (.96, .9, .77), .66)
rose = material('Rose ribbons', (.58, .16, .19), .5)
leather = material('Cocoa shoes', (.12, .045, .027), .36)
sole = material('Shoe sole', (.065, .025, .014), .7)
white = material('Eye ivory', (.97, .92, .8), .25)
iris = material('Honey iris', (.19, .066, .024), .23)
iris_gold = material('Honey iris rim', (.12, .044, .020), .27)
ink = material('Lashes', (.033, .012, .008), .5)
pupil = material('Eye glass', (.012, .004, .003), .12)
glint = material('Eye sparkle', (1, .99, .92), .12)
gold = material('Warm gold', (.73, .41, .12), .28, .68)
mouth = material('Rose mouth', (.39, .08, .073), .54)
painted_iris(iris)
painted_hair([hair,hair_light])
objects = []
rigid = []

def finish(obj, mat, bone=None):
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    objects.append(obj)
    if bone: rigid.append((obj, bone))
    return obj

def mesh(name, vertices, faces, mat, bone=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, bone)

def sphere(name, pos, size, mat, bone=None, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if name in ['Eye ivory','Amber iris rim','Amber iris','Deep glossy pupil','Large eye catchlight','Small eye catchlight']:
        obj.rotation_euler.z = .18 if pos[0]>0 else -.18
        bpy.context.view_layer.update()
        world=obj.matrix_world.copy()
        inverse=world.inverted()
        obj.shape_key_add(name='Basis')
        blink=obj.shape_key_add(name='blink')
        for vertex in blink.data:
            point=world@vertex.co
            point.z=2.555+(point.z-2.555)*.015
            point.y=face_y(point.x,point.z)+.06
            vertex.co=inverse@point
        if name=='Amber iris': iris_uv(obj,size[0],size[2])
    return finish(obj, mat, bone)

def tube(name, points, radius, mat, bone=None, resolution=3):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 3 if 'stitched' in name else 8
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for b, p in zip(spline.bezier_points, points):
        b.co = p
        b.handle_left_type = b.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return finish(obj, mat, bone)

def segment(name, a, b, radius, mat):
    center = (Vector(a)+Vector(b))/2
    obj = sphere(name, center, (radius, radius, (Vector(b)-Vector(a)).length/2+radius), mat, segments=24, rings=16)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (Vector(b)-Vector(a)).to_track_quat('Z', 'Y')
    return obj

# A single welded skin mesh: elbow/knee vertices belong to both neighbouring bones.
parts = [sphere('body volume', (0, 0, 1.47), (.29, .17, .41), skin)]
parts += [sphere('neck volume', (0, 0, 1.9), (.115, .11, .18), skin)]
joints = {}
for side, sign in [('L', 1), ('R', -1)]:
    shoulder, elbow, wrist = (sign*.285, 0, 1.79), (sign*.455, -.015, 1.48), (sign*.54, -.045, 1.23)
    hip, knee, ankle = (sign*.15, 0, 1.12), (sign*.16, -.018, .7), (sign*.16, .0, .29)
    joints[side] = (shoulder, elbow, wrist, hip, knee, ankle)
    parts += [segment('upper arm volume', shoulder, elbow, .091, skin), segment('forearm volume', elbow, wrist, .078, skin)]
    parts += [sphere('hand volume', (sign*.555, -.048, 1.165), (.094, .078, .118), skin)]
    parts += [sphere('thumb volume', (sign*.491, -.097, 1.177), (.039, .037, .062), skin)]
    parts += [segment('thigh volume', hip, knee, .105, skin), segment('shin volume', knee, ankle, .084, skin)]
bpy.ops.object.select_all(action='DESELECT')
for obj in parts: obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Continuous body skin'
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
remesh = body.modifiers.new('Weld shoulders elbows knees', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = .026
remesh.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth = body.modifiers.new('Soft anatomy', 'SMOOTH')
smooth.factor = .9
smooth.iterations = 5
bpy.ops.object.modifier_apply(modifier=smooth.name)
sub = body.modifiers.new('Rounded surface', 'SUBSURF')
sub.levels = 1
bpy.ops.object.modifier_apply(modifier=sub.name)
decimate = body.modifiers.new('Web surface density', 'DECIMATE')
decimate.ratio = .55
bpy.ops.object.modifier_apply(modifier=decimate.name)
objects = [body]

# Huge rounded doll head and native 3D facial details; no portrait billboards.
head = sphere('Doll face', (0, -.006, 2.54), (.635, .485, .655), skin, 'head', 48, 32)
# A short rounded chin keeps the proportions soft rather than adult-like.
for vertex in head.data.vertices:
    if vertex.co.z < 0: vertex.co.z *= .77
def face_y(x, z):
    height=.655 if z>=2.54 else .655*.77
    return -.006 - .485*math.sqrt(max(.05, 1-(x/.635)**2-((z-2.54)/height)**2))

def closing_lash(obj,center_x,outer_base=None):
    obj.shape_key_add(name='Basis')
    blink=obj.shape_key_add(name='blink')
    for vertex in blink.data:
        point=vertex.co.copy()
        u=max(-1,min(1,(point.x-center_x)/.173))
        arch=math.sqrt(max(0,1-u*u))
        point.z=point.z-.224*arch if outer_base is None else 2.565+(point.z-outer_base)*.5
        point.y=face_y(point.x,point.z)-.012
        vertex.co=point

def upper_lash(center_x):
    # Build corresponding round cross-sections in both poses. Flattening an
    # already curved tube by vertex X gives sharp spikes at the eye corners.
    def surface(closed):
        result=[]
        for i in range(49):
            a=math.pi*(.04+.92*i/48)
            xx=center_x+.173*math.cos(a)
            zz=2.555+(-.020 if closed else .204)*math.sin(a)
            yy=face_y(xx,zz)-.014 if closed else -.492
            tangent=Vector((-.173*math.sin(a),0,(-.020 if closed else .204)*math.cos(a))).normalized()
            across=Vector((-tangent.z,0,tangent.x))
            radius=.009*(.85+.15*math.sin(a))
            for j in range(8):
                angle=2*math.pi*j/8
                point=Vector((xx,yy,zz))+across*(radius*math.sin(angle))+Vector((0,-radius*math.cos(angle),0))
                result.append(tuple(point))
        return result
    faces=[]
    for i in range(48):
        for j in range(8):
            faces.append((i*8+j,i*8+(j+1)%8,(i+1)*8+(j+1)%8,(i+1)*8+j))
    faces.extend([tuple(range(7,-1,-1)),tuple(48*8+j for j in range(8))])
    obj=mesh('Soft upper lashes',surface(False),faces,ink,'head')
    obj.shape_key_add(name='Basis')
    blink=obj.shape_key_add(name='blink')
    for vertex,point in zip(blink.data,surface(True)): vertex.co=point

blush_mat = material('Watercolour cheeks', (.81, .49, .35), .61)
shader = blush_mat.node_tree.nodes.get('Principled BSDF')
color_node = blush_mat.node_tree.nodes.new('ShaderNodeVertexColor')
color_node.layer_name = 'blush'
blush_mat.node_tree.links.new(color_node.outputs['Color'], shader.inputs['Base Color'])
for sign in [-1, 1]:
    x = sign*.236
    sphere('Eye ivory', (x, -.460, 2.555), (.153, .028, .186), white, 'head', 40, 24)
    sphere('Amber iris rim', (x+sign*.006, -.480, 2.547), (.141, .022, .172), iris_gold, 'head', 40, 24)
    sphere('Amber iris', (x+sign*.006, -.494, 2.555), (.134, .020, .166), iris, 'head', 40, 24)
    sphere('Deep glossy pupil', (x+sign*.008, -.509, 2.57), (.081, .016, .107), pupil, 'head', 36, 24)
    sphere('Large eye catchlight', (x-.026, -.527, 2.623), (.027, .007, .032), glint, 'head', 20, 12)
    sphere('Small eye catchlight', (x+.039, -.522, 2.488), (.011, .006, .012), glint, 'head', 16, 12)
    upper_lash(x)
    for n in range(3):
        xx = x+sign*(.12+n*.014)
        zz = 2.65-n*.035
        closing_lash(tube('Outer eyelash', [(xx, -.495, zz), (xx+sign*.026, -.496, zz+.034)], .007-n*.001, ink, 'head', 2),x,zz)
    tube('Gentle brow', [(x-.105, -.472, 2.814), (x, -.475, 2.833), (x+.092, -.468, 2.813)], .014, hair, 'head')
    vertices, faces, colors = [], [], []
    for r in range(9):
        rr = r/8
        for j in range(40):
            a = 2*math.pi*j/40
            xx, zz = sign*.337+.106*rr*math.cos(a), 2.341+.055*rr*math.sin(a)
            vertices.append((xx, face_y(xx, zz)-.004, zz))
            fade = .60*(1-rr*rr)**2
            colors.append(tuple(c*(1-fade)+d*fade for c, d in zip((.81,.49,.35), (.95,.23,.24)))+(1,))
            if r < 8: faces.append((r*40+j, (r+1)*40+j, (r+1)*40+(j+1)%40, r*40+(j+1)%40))
    cheek = mesh('Blended rosy cheek', vertices, faces, blush_mat, 'head')
    attr = cheek.data.color_attributes.new(name='blush', type='FLOAT_COLOR', domain='POINT')
    for datum, color in zip(attr.data, colors): datum.color = color
sphere('Tiny button nose', (0, -.491, 2.412), (.033, .025, .025), skin, 'head', 24, 16)
tube('Petal smile', [(-.052, face_y(-.052,2.298)-.007, 2.303), (0, face_y(0,2.29)-.007, 2.29), (.052, face_y(.052,2.298)-.007, 2.303)], .012, mouth, 'head')
sphere('Lower lip', (0, face_y(0,2.28)-.008, 2.276), (.027, .009, .009), rose, 'head', 20, 12)
for sign in [-1,1]: sphere('Little ear', (sign*.61, .0, 2.48), (.083, .082, .124), skin, 'head')

# Curved eyelid morphs close over the eye glass without flattening the pupils.
for sign in [-1,1]:
    x=sign*.236
    def lid_vertices(closed):
        result=[]
        for row in range(13):
            v=row/12
            for column in range(33):
                u=(column/32)*2-1
                arch=math.sqrt(max(0,1-u*u))
                top=2.555+.208*arch
                bottom=top-(.415 if closed else .004)*arch
                zz=top*(1-v)+bottom*v
                xx=x+.175*u
                yy=face_y(xx,zz)-.005 if closed else -.571-.013*arch*math.sin(math.pi*v)
                result.append((xx,yy,zz))
        return result
    faces=[]
    for row in range(12):
        for column in range(32):
            n=row*33+column
            faces.append((n,n+33,n+34,n+1))
    lid=mesh('Eyelid.'+('L' if sign==1 else 'R'),lid_vertices(False),faces,skin,'head')
    lid.shape_key_add(name='Basis')
    blink=lid.shape_key_add(name='blink')
    for vertex,pos in zip(blink.data,lid_vertices(True)): vertex.co=pos

# Bob cap is open around the face. Sculpted locks have tapered elliptical cross-sections.
vertices, faces = [], []
for i in range(28):
    t = i/27
    for j in range(80):
        a = 2*math.pi*j/80
        front = max(0, math.cos(a))**5
        phi = t*(2.13-1.09*front)
        vertices.append((.672*math.sin(phi)*math.sin(a), -.515*math.sin(phi)*math.cos(a)+.017, 2.59+.665*math.cos(phi)))
        if i < 27: faces.append((i*80+j, i*80+(j+1)%80,(i+1)*80+(j+1)%80,(i+1)*80+j))
cap=mesh('Sculpted bob cap', vertices, faces, hair, 'head')
uv=cap.data.uv_layers.new(name='UVMap')
for polygon in cap.data.polygons:
    js=[cap.data.loops[i].vertex_index%80 for i in polygon.loop_indices]
    seam=max(js)-min(js)>40
    for index in polygon.loop_indices:
        n=cap.data.loops[index].vertex_index
        j=n%80
        uv.data[index].uv=((1 if seam and j==0 else j/80)*8,(n//80)/27)

def hair_lock(name, path, widths, mat):
    vertices, faces = [], []
    for i, point in enumerate(path):
        p = Vector(point)
        tangent = Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])
        tangent.normalize()
        normal = Vector((p.x, p.y-.03, max(.12,p.z-2.5))).normalized()
        across = tangent.cross(normal).normalized()
        normal = across.cross(tangent).normalized()
        for j in range(12):
            a = 2*math.pi*j/12
            v = p+across*(widths[i]*math.cos(a))+normal*(widths[i]*.10*math.sin(a))
            vertices.append(tuple(v))
            if i < len(path)-1: faces.append((i*12+j,i*12+(j+1)%12,(i+1)*12+(j+1)%12,(i+1)*12+j))
    faces.extend([tuple(range(11,-1,-1)),tuple((len(path)-1)*12+j for j in range(12))])
    obj=mesh(name,vertices,faces,mat,'head')
    uv=obj.data.uv_layers.new(name='UVMap')
    for loop in obj.data.loops:
        n=loop.vertex_index
        uv.data[loop.index].uv=(.5+.5*math.cos(2*math.pi*(n%12)/12),n//12/(len(path)-1))
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    sub=obj.modifiers.new('Soft overlapping hair layers','SUBSURF')
    sub.levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    obj.select_set(False)
    return obj

for j in range(22):
    a = .73+(2*math.pi-1.46)*j/21
    path, widths = [], []
    for i in range(17):
        t = i/16
        phi = .17+1.96*t
        aa = a+.10*math.sin(math.pi*t)
        flare = .035*math.sin(math.pi*t)**2
        path.append(((.685+flare)*math.sin(phi)*math.sin(aa), -(.53+flare)*math.sin(phi)*math.cos(aa)+.022, 2.6+.671*math.cos(phi)))
        widths.append(.009+.088*math.sin(math.pi*t)**.35)
    hair_lock('Soft bob layer', path,widths,hair_light if j%5==0 else hair)
# Curved side-swept fringe: tips end above the eyes, never cover pupils.
for j in range(7):
    start_x = .02+(j-3)*.018
    end_x = -.39+j*.116
    path, widths = [], []
    for i in range(19):
        t = i/18
        xx = start_x*(1-t)+end_x*t-.075*math.sin(math.pi*t)
        zz = 3.25-.46*t-.025*math.sin(j*.7)*t
        yy = -.515*math.sqrt(max(.012,1-(xx/.672)**2-((zz-2.59)/.665)**2))-.02
        path.append((xx,yy,zz))
        widths.append(.008+.072*math.sin(math.pi*t)**.45)
    hair_lock('Swept fringe',path,widths,hair_light if j==1 else hair)

# Cafe couture follows the original caramel cafe avatar design.
garments=[]
build_cafe_outfit(globals())

# Armature. All rest transforms are applied before binding; export keeps real skin weights.
bpy.ops.object.select_all(action='DESELECT')
data=bpy.data.armatures.new('Doll skeleton')
rig=bpy.data.objects.new('Doll rig',data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=data.edit_bones.new(name)
    b.head,b.tail=head,tail
    if parent: b.parent=data.edit_bones[parent]
    return b
bone('doll_root',(0,0,.0),(0,0,.25))
bone('hips',(0,0,1.10),(0,0,1.38),'doll_root')
bone('chest',(0,0,1.38),(0,0,1.80),'hips')
bone('neck',(0,0,1.80),(0,0,2.02),'chest')
bone('head',(0,0,2.02),(0,0,2.75),'neck')
for side,pts in joints.items():
    shoulder,elbow,wrist,hip,knee,ankle=pts
    sign=1 if side=='L' else -1
    bone('upper_arm.'+side,shoulder,elbow,'chest')
    bone('forearm.'+side,elbow,wrist,'upper_arm.'+side)
    bone('hand.'+side,wrist,(sign*.555,-.048,1.07),'forearm.'+side)
    bone('thigh.'+side,hip,knee,'hips')
    bone('shin.'+side,knee,ankle,'thigh.'+side)
    bone('foot.'+side,ankle,(sign*.16,-.18,.16),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
for pb in rig.pose.bones: pb.rotation_mode='XYZ'

def bind(obj, weights):
    groups={name:obj.vertex_groups.new(name=name) for name in data.bones.keys()}
    for vertex in obj.data.vertices:
        ws=weights(obj.matrix_world@vertex.co)
        total=sum(ws.values())
        for name,w in ws.items():
            if w>0: groups[name].add([vertex.index],w/total,'REPLACE')
    mod=obj.modifiers.new('Skeletal deformation','ARMATURE')
    mod.object=rig
    obj.parent=rig

def smoothstep(a,b,value):
    t=max(0,min(1,(value-a)/(b-a)))
    return t*t*(3-2*t)

def skin_weights(p):
    x,y,z=p
    side='L' if x>=0 else 'R'
    ax=abs(x)
    if z>1.86 and ax<.22:
        t=smoothstep(1.83,2.02,z)
        return {'chest':1-t,'neck':t}
    arm_start=.175+max(0,1.79-z)*.4
    shoulder=smoothstep(arm_start,arm_start+.14,ax)
    blend=smoothstep(1.58,1.70,z)
    arm=(smoothstep(.295,.33,ax)*(1-blend)+shoulder*blend) if z>.90 else 0
    if arm>0:
        shoulder,elbow,wrist,*_=joints[side]
        v=Vector(wrist)-Vector(shoulder)
        t=(p-Vector(shoulder)).dot(v)/v.length_squared
        lower=smoothstep(.43,.70,t)
        hand=smoothstep(.91,1.16,t)
        chest=smoothstep(1.29,1.56,z)
        return {'hips':(1-arm)*(1-chest),'chest':(1-arm)*chest,'upper_arm.'+side:arm*(1-lower),'forearm.'+side:arm*lower*(1-hand),'hand.'+side:arm*lower*hand}
    if z<1.15:
        leg=smoothstep(1.16,.99,z)
        lower=smoothstep(.82,.60,z)
        foot=smoothstep(.38,.22,z)
        return {'hips':1-leg,'thigh.'+side:leg*(1-lower),'shin.'+side:leg*lower*(1-foot),'foot.'+side:leg*lower*foot}
    chest=smoothstep(1.29,1.56,z)
    return {'hips':1-chest,'chest':chest}

# Blender's heat diffusion distributes shoulder/elbow weights over the welded
# volume. This avoids a hand-written boundary stretching small armpit triangles.
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
for obj in garments:
    if 'skirt' in obj.name.lower() or 'hem' in obj.name.lower() or 'piping' in obj.name.lower():
        # Hips carry the waist, with subtle thigh influence at the hem during dancing.
        def skirt_weights(p):
            sway=.12*(1-smoothstep(.94,1.41,p.z))
            return {'hips':1-sway,'thigh.L' if p.x>=0 else 'thigh.R':sway}
        bind(obj,skirt_weights)
    else: bind(obj,skin_weights)
for obj,name in rigid: bind(obj,lambda p,n=name:{n:1})

# Shorten the body and matching bind joints together, preserving skin correspondence.
def doll_z(z): return .09+(z-.09)*.78 if z<2.02 else z-(2.02-.09)*.22
for obj in list(scene.objects):
    if obj.type!='MESH': continue
    world=obj.matrix_world.copy()
    inverse=world.inverted()
    keys=obj.data.shape_keys.key_blocks if obj.data.shape_keys else []
    collections=[key.data for key in keys] if keys else [obj.data.vertices]
    is_head=any(bound==obj and name=='head' for bound,name in rigid)
    for collection in collections:
        for vertex in collection:
            pos=world@vertex.co
            pos.z=doll_z(pos.z)
            if is_head: pos.z-=.08
            vertex.co=inverse@pos
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for b in data.edit_bones:
    b.head.z=doll_z(b.head.z)
    b.tail.z=doll_z(b.tail.z)
    if b.name=='head':
        b.head.z-=.08
        b.tail.z-=.08
    elif b.name=='neck': b.tail.z-=.08
bpy.ops.object.mode_set(mode='OBJECT')

# Joining meshes by material keeps the silhouette, weights and detail while cutting
# nearly a hundred skinning draw calls to about twenty. Keep the welded body separate.
by_material={}
for obj in list(scene.objects):
    if obj.type=='MESH' and obj!=body and not obj.name.startswith('Eyelid'):
        key=obj.data.materials[0].name
        by_material.setdefault(key,[]).append(obj)
for name,group in by_material.items():
    if len(group)<2: continue
    group.sort(key=lambda obj: not bool(obj.data.shape_keys))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in group: obj.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    bpy.ops.object.join()
    bpy.context.object.name='Doll details / '+name

# Named NLA actions are baked into glTF animation clips, not CSS image transforms.
def clip(name,seconds,pose):
    action=bpy.data.actions.new(name)
    rig.animation_data_create()
    rig.animation_data.action=action
    count=round(seconds*30)
    for frame in range(0,count+1,3):
        t=frame/30
        for pb in rig.pose.bones:
            pb.location=(0,0,0)
            pb.rotation_euler=(0,0,0)
        pose(t,seconds)
        for pb in rig.pose.bones:
            pb.keyframe_insert(data_path='rotation_euler',frame=frame)
            if pb.name=='doll_root': pb.keyframe_insert(data_path='location',frame=frame)
    track=rig.animation_data.nla_tracks.new()
    track.name=name
    strip=track.strips.new(name,0,action)
    strip.name=name
    rig.animation_data.action=None

def rotate(name,x=0,y=0,z=0): rig.pose.bones[name].rotation_euler=(x,y,z)
def ease(t,start,end): return smoothstep(start,end,t)
def envelope(t,d): return ease(t,0,.7)*(1-ease(t,d-.75,d))
def idle(t,d):
    a=2*math.pi*t/d
    rotate('chest',.012*math.sin(a),.016*math.sin(a),0)
    rotate('head',.017*math.sin(a+.7),.022*math.sin(a),-.016*math.sin(a+.4))
    rotate('upper_arm.L',.016*math.sin(a),0,-.025*math.sin(a))
    rotate('upper_arm.R',-.016*math.sin(a),0,.025*math.sin(a))
def wave(t,d):
    e=envelope(t,d)
    rotate('upper_arm.L',-.10*e,0,-1.15*e)
    rotate('forearm.L',-.25*e,0,-.95*e)
    rotate('hand.L',.08*e, .32*e*math.sin((t-.7)*2*math.pi*1.6), .11*e*math.sin((t-.7)*2*math.pi*1.6))
    rotate('head',-.018*e,.09*e,-.09*e)
    rotate('chest',0,0,-.035*e)
    rotate('forearm.R',-.13*e,0,0)
def dance(t,d):
    e=envelope(t,d)
    a=(t-.7)*2*math.pi*1.1
    beat=math.sin(a)
    rig.pose.bones['doll_root'].location=(.045*e*beat,0,-.025*e*(1+math.cos(a*2)))
    rotate('hips',0,.035*e*beat,.065*e*beat)
    rotate('chest',.025*e,-.06*e*beat,-.07*e*beat)
    rotate('head',-.015*e,.10*e*beat,.07*e*beat)
    for side,sign in [('L',1),('R',-1)]:
        knee=.17*e*(1+math.sin(a+sign*math.pi/2))
        rotate('thigh.'+side,-knee*.7,0,sign*.045*e)
        rotate('shin.'+side,knee,0,0)
        rotate('upper_arm.'+side,-.30*e,0,-sign*(.38+.14*beat)*e)
        rotate('forearm.'+side,-(.55+.2*sign*beat)*e,0,0)
        rotate('hand.'+side,0,sign*.12*e*beat,0)
def pose(t,d):
    e=envelope(t,d)
    rig.pose.bones['doll_root'].location=(0,0,-.045*e)
    rotate('hips',-.05*e,0,.06*e)
    rotate('chest',.06*e,.13*e,0)
    rotate('head',-.05*e,-.16*e,-.10*e)
    rotate('upper_arm.L',-.14*e,0,-1.35*e)
    rotate('forearm.L',-.20*e,0,-1.15*e)
    rotate('hand.L',0,-.32*e,0)
    rotate('upper_arm.R',-.11*e,0,.22*e)
    rotate('forearm.R',-.36*e,0,0)
    rotate('thigh.L',-.10*e,0,-.03*e)
    rotate('shin.L',.20*e,0,0)
    rotate('thigh.R',-.18*e,0,.04*e)
    rotate('shin.R',.30*e,0,0)
clip('idle',4.8,idle)
clip('wave',4.2,wave)
clip('dance',5.4,dance)
clip('pose',3.9,pose)
for track in rig.animation_data.nla_tracks: track.mute=True
scene.frame_set(0)
for pb in rig.pose.bones:
    pb.location=(0,0,0)
    pb.rotation_euler=(0,0,0)
for track in rig.animation_data.nla_tracks: track.mute=False

manifest={
    'name':'Caramel cafe doll', 'generator':'Blender 4.5 / scripts/build-avatar-3d.py + avatar_cafe_details.py',
    'license':'Original procedural artwork made for Dealvue; no third-party character assets.',
    'bones':len(data.bones), 'meshObjects':len([o for o in scene.objects if o.type=='MESH']),
    'vertices':sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH'),
    'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene.objects if o.type=='MESH'),
    'clips':{'idle':4.8,'wave':4.2,'dance':5.4,'pose':3.9},
    'continuousSkinMesh':'Continuous body skin', 'outfit':'Caramel gingham dress, ruffled apron, patisserie embroidery, cocoa ribbon shoes',
}
with open(os.path.join(output,'manifest.json'),'w',encoding='utf8') as f: json.dump(manifest,f,indent=2)
source_dir=os.path.abspath('assets/avatar-3d')
os.makedirs(source_dir,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(source_dir,'avatar.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(output,'avatar.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_skins=True,export_yup=True,export_materials='EXPORT',export_extras=True)
print('AVATAR_MODEL_READY '+json.dumps(manifest))
