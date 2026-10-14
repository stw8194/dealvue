"""Sculpted clothing and painted materials matching the existing caramel cafe look.

Textures are generated from mathematical patterns, packed into the .blend and GLB.
All trim, bows, apron, embroidery and dessert motifs are native rigged geometry.
"""
import bpy
import math
from mathutils import Vector


def texture(name, size, pixel):
    image=bpy.data.images.new(name,width=size,height=size,alpha=True)
    values=[]
    for y in range(size):
        for x in range(size): values.extend(pixel((x+.5)/size,(y+.5)/size))
    image.pixels.foreach_set(values)
    image.pack()
    return image


def painted_iris(mat):
    def pixel(u,v):
        x,y=(u-.5)*2,(v-.5)*2
        r=math.sqrt(x*x+y*y)
        angle=math.atan2(y,x)
        fibres=(math.sin(angle*87+r*25)+math.sin(angle*137-r*16)+math.sin(angle*53+r*45))/3
        lower=max(0,-y)*.34
        edge=max(0,min(1,(1-r)/.20))
        color=[(.28+lower+.035*fibres)*edge+.025*(1-edge),(.115+lower*.46+.018*fibres)*edge+.012*(1-edge),(.052+lower*.20+.01*fibres)*edge+.009*(1-edge)]
        if r<.53:
            t=max(0,min(1,(r-.44)/.09))
            color=[c*t+.012*(1-t) for c in color]
        return (*color,1)
    image=texture('Painted amber iris fibres',256,pixel)
    node=mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image=image
    mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.21
    return image


def painted_hair(materials):
    def pixel(u,v):
        broad=.018*math.sin(u*math.pi*18+.13*math.sin(v*5))
        fine=.014*math.sin(u*math.pi*128+.15*math.sin(v*7))+.005*math.sin(u*math.pi*302)
        light=broad+fine
        return (.36+light,.193+light*.65,.124+light*.45,1)
    image=texture('Chestnut fine hair fibres',256,pixel)
    for mat in materials:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image=image
        mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return image


def iris_uv(obj,rx,rz,center_z=0):
    layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='Iris painting')
    for loop in obj.data.loops:
        p=obj.data.vertices[loop.vertex_index].co
        layer.data[loop.index].uv=(.5+p.x/(2*rx),.5+(p.z-center_z)/(2*rz))


def build_cafe_outfit(api):
    sphere,mesh,tube,material=(api[name] for name in ['sphere','mesh','tube','material'])
    dress,lace,leather,sole,gold=(api[name] for name in ['cream','lace','leather','sole','gold'])
    garments=api['garments']
    ribbon=material('Cafe ribbon',(.14,.055,.026),.43)
    cherry=material('Strawberry jam',(.58,.055,.064),.39)
    pistachio=material('Pistachio leaf',(.12,.22,.055),.6)
    pastry=material('Golden pastry',(.63,.29,.08),.63)
    icing=material('Strawberry icing',(.93,.58,.46),.6)

    def gingham(u,v):
        x,y=(u*4)%1,(v*4)%1
        sx,sy=(1 if x<.5 else 0),(1 if y<.5 else 0)
        base=[(.97,.955,.92),(.69,.54,.39),(.43,.25,.13)][sx+sy]
        thread=.012*math.sin(u*math.pi*256)+.009*math.sin(v*math.pi*256)
        seam=min(x%(.5),y%(.5))<.012
        delta=thread-(.025 if seam else 0)
        return (*(max(0,c+delta) for c in base),1)
    check=texture('Caramel woven gingham',256,gingham)
    node=dress.node_tree.nodes.new('ShaderNodeTexImage')
    node.image=check
    dress.node_tree.links.new(node.outputs['Color'],dress.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    dress.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.77
    dress.diffuse_color=(1,1,1,1)

    def repeat_uv(obj,u,v):
        for datum in obj.data.uv_layers.active.data:
            datum.uv.x*=u
            datum.uv.y*=v

    def dress_radius(t): return .285+.27*(math.sin(t*math.pi/2)**.88)
    def skirt(name,top,bottom,mat,offset=0,amplitude=.019):
        vertices,faces=[],[]
        for i in range(21):
            t=i/20
            for j in range(160):
                a=2*math.pi*j/160
                r=dress_radius(t)+offset+amplitude*math.cos(a*18)*t
                vertices.append((r*math.sin(a),r*.66*math.cos(a),top+(bottom-top)*t+.008*math.cos(a*18)*t))
                if i<20: faces.append((i*160+j,i*160+(j+1)%160,(i+1)*160+(j+1)%160,(i+1)*160+j))
        obj=mesh(name,vertices,faces,mat)
        uv=obj.data.uv_layers.new(name='UVMap')
        for polygon in obj.data.polygons:
            js=[obj.data.loops[i].vertex_index%160 for i in polygon.loop_indices]
            seam=max(js)-min(js)>80
            for index in polygon.loop_indices:
                n=obj.data.loops[index].vertex_index
                j=n%160
                uv.data[index].uv=((1 if seam and j==0 else j/160)*6,(n//160)/20*1.4)
        garments.append(obj)
        return obj

    bodice=sphere('Cafe checked bodice',(0,-.004,1.56),(.307,.187,.30),dress,segments=40,rings=28)
    repeat_uv(bodice,3,1.5)
    garments.append(bodice)
    skirt('Cafe bell skirt',1.41,.88,dress)

    def ring_frill(name,radius,z,depth,width,mat,waves=52,bone=None):
        vertices,faces=[],[]
        for i in range(6):
            t=i/5
            for j in range(208):
                a=2*math.pi*j/208
                r=radius+width*t+.009*math.sin(waves*a)*t
                vertices.append((r*math.sin(a),r*.66*math.cos(a),z-depth*t+.01*math.cos(waves*a)*t))
                if i<5: faces.append((i*208+j,i*208+(j+1)%208,(i+1)*208+(j+1)%208,(i+1)*208+j))
        obj=mesh(name,vertices,faces,mat,bone)
        if not bone: garments.append(obj)
        return obj
    ring_frill('Milk petticoat hem',.54,.895,.071,.024,lace)
    ring_frill('Cafe gathered skirt hem',.537,.965,.059,.041,dress)
    # UVs on the lower checked flounce follow the main cloth weave.
    hem=garments[-1]
    uv=hem.data.uv_layers.new(name='UVMap')
    for loop in hem.data.loops:
        n=loop.vertex_index
        uv.data[loop.index].uv=(n%208/208*6,n//208/5*.17)

    # Full apron, following the bell-shaped skirt rather than a flat rectangular plate.
    def apron_point(u,t):
        z=1.409-.401*t-.017*(1-u*u)*t
        r=dress_radius((1.41-z)/.53)
        width=.209+.16*math.sin(t*math.pi/2)
        x=u*width
        y=-.66*math.sqrt(max(.01,r*r-x*x))-.019
        y-=.012*math.cos(u*math.pi*9)*t
        return Vector((x,y,z))
    vertices,faces=[],[]
    for i in range(21):
        t=i/20
        for j in range(41):
            u=j/20-1
            vertices.append(tuple(apron_point(u,t)))
            if i<20 and j<40:
                n=i*41+j
                faces.append((n,n+41,n+42,n+1))
    garments.append(mesh('Cafe apron skirt',vertices,faces,lace))
    # One continuous gathered strip around the apron, with a sewn inner edge.
    border=[apron_point(-1,t/40) for t in range(41)]
    border += [apron_point(u/40*2-1,1) for u in range(1,41)]
    border += [apron_point(1,1-t/40) for t in range(1,41)]
    vertices,faces=[],[]
    for i,p in enumerate(border):
        tangent=(border[min(i+1,len(border)-1)]-border[max(0,i-1)]).normalized()
        across=Vector((tangent.z,0,-tangent.x))
        for j in range(5):
            t=j/4
            v=p+across*(.043*t)
            v.y-=.004+.013*math.sin(i*math.pi*.8)*t
            vertices.append(tuple(v))
            if i<len(border)-1 and j<4:
                n=i*5+j
                faces.append((n,n+5,n+6,n+1))
    garments.append(mesh('Cafe apron skirt ruffles',vertices,faces,lace))
    seam=tube('Apron skirt stitched border',[tuple(p+Vector((0,-.006,0))) for p in border[::4]],.0036,material('Apron thread',(.71,.53,.36),.85))
    garments.append(seam)

    def chest_y(x,z): return -.004-.187*math.sqrt(max(.08,1-(x/.307)**2-((z-1.56)/.30)**2))
    vertices,faces=[],[]
    for i in range(14):
        t=i/13
        z=1.797-.393*t
        for j in range(25):
            x=(j/12-1)*(.132-.015*t)
            vertices.append((x,chest_y(x,z)-.016,z))
            if i<13 and j<24:
                n=i*25+j
                faces.append((n,n+25,n+26,n+1))
    garments.append(mesh('Cafe apron bib',vertices,faces,lace))
    for sign in [-1,1]:
        vertices,faces=[],[]
        for i in range(33):
            t=i/32
            z=1.815-.413*t
            for j in range(5):
                v=j/4
                x=sign*(.14+.046*v+.008*math.sin(t*math.pi*18)*v)
                vertices.append((x,chest_y(x,z)-.02-.013*math.cos(t*math.pi*18)*v,z))
                if i<32 and j<4:
                    n=i*5+j
                    face=(n,n+5,n+6,n+1)
                    faces.append(face if sign==1 else tuple(reversed(face)))
        garments.append(mesh('Gathered apron shoulder strap',vertices,faces,lace))

    for side,sign in [('L',1),('R',-1)]:
        sleeve=sphere('Checked puff sleeve '+side,(sign*.34,0,1.713),(.151,.144,.158),dress,'upper_arm.'+side,32,24)
        repeat_uv(sleeve,2.3,1.3)
        # Cuff follows the local arm cross-section, with a scalloped lace edge.
        centre=Vector((sign*.395,0,1.614))
        direction=Vector((sign*.17,0,-.31)).normalized()
        across=Vector((0,1,0))
        vertical=direction.cross(across).normalized()
        vertices,faces=[],[]
        for i in range(5):
            t=i/4
            for j in range(80):
                a=2*math.pi*j/80
                r=.119+.01*math.sin(a*20)*t
                p=centre+direction*(.046*t)+across*(math.cos(a)*r)+vertical*(math.sin(a)*r)
                vertices.append(tuple(p))
                if i<4: faces.append((i*80+j,i*80+(j+1)%80,(i+1)*80+(j+1)%80,(i+1)*80+j))
        mesh('Lace sleeve cuff '+side,vertices,faces,lace,'upper_arm.'+side)
        sock=sphere('Cream stocking '+side,(sign*.16,0,.52),(.088,.09,.255),lace,segments=28,rings=20)
        garments.append(sock)
        sphere('Cafe rounded shoe '+side,(sign*.16,-.063,.185),(.137,.198,.108),leather,'foot.'+side,32,24)
        sphere('Cafe soft ankle boot '+side,(sign*.16,.01,.261),(.115,.12,.073),leather,'foot.'+side,28,16)
        sphere('Cafe low sole '+side,(sign*.16,-.059,.115),(.142,.195,.038),sole,'foot.'+side,32,16)
        tube('Cafe shoe strap '+side,[(sign*.16-.12,-.055,.219),(sign*.16,-.096,.285),(sign*.16+.12,-.055,.219)],.019,leather,'foot.'+side)
        sphere('Brass shoe buckle '+side,(sign*.16+sign*.105,-.124,.242),(.025,.015,.022),gold,'foot.'+side,20,14)
        for bow_sign in [-1,1]:
            loop=sphere('Shoe ribbon loop',(sign*.16+bow_sign*.029,-.259,.244),(.034,.012,.018),ribbon,'foot.'+side,20,12)
            loop.rotation_euler.y=bow_sign*.35
        sphere('Shoe ribbon knot',(sign*.16,-.273,.244),(.012,.008,.012),gold,'foot.'+side,16,10)
        for a in [0,.5,1,1.5,2,2.5,3]:
            sphere('Sock lace bead',(sign*.16+.087*math.cos(a*2),.09*math.sin(a*2),.34),(.009,.008,.016),lace,'shin.'+side,12,8)

    # Folded collar wings and softly twisted chocolate ribbon loops.
    for sign in [-1,1]:
        vertices,faces=[],[]
        for i in range(7):
            v=i/6
            for j in range(17):
                u=j/16
                x=sign*(.014+.163*u)
                z=1.854-.05*u-.078*v*(.45+.55*math.sin(math.pi*u))
                vertices.append((x,chest_y(x,z)-.028-.014*math.sin(math.pi*u),z))
                if i<6 and j<16:
                    n=i*17+j
                    face=(n,n+17,n+18,n+1)
                    faces.append(face if sign==1 else tuple(reversed(face)))
        mesh('Folded cafe collar',vertices,faces,lace,'chest')
        vertices,faces=[],[]
        for i in range(41):
            a=2*math.pi*i/40
            centre=Vector((sign*(.022+.107*math.sin(a/2)), -.247-.018*math.sin(a),1.753+.037*math.sin(a)))
            for j in range(5):
                v=j/4-.5
                vertices.append(tuple(centre+Vector((sign*v*.014, v*.019*math.sin(a),v*.046))))
                if i<40 and j<4:
                    n=i*5+j
                    faces.append((n,n+5,n+6,n+1))
        mesh('Chocolate ribbon loop',vertices,faces,ribbon,'chest')
        tube('Chocolate ribbon tail',[(sign*.014,-.246,1.734),(sign*.044,-.254,1.66),(sign*.066,-.246,1.637)],.017,ribbon,'chest')
    sphere('Chocolate bow knot',(0,-.267,1.747),(.028,.021,.027),ribbon,'chest',24,16)
    # Waist sash and a tied bow are visible when the character is turned around.
    vertices,faces=[],[]
    for i in range(3):
        for j in range(96):
            a=j/96*math.pi*2
            r=.299+i*.001
            vertices.append((r*math.sin(a),r*.66*math.cos(a),1.418-i*.02))
            if i<2: faces.append((i*96+j,i*96+(j+1)%96,(i+1)*96+(j+1)%96,(i+1)*96+j))
    mesh('Cafe waist sash',vertices,faces,ribbon,'hips')
    for sign in [-1,1]:
        sphere('Back apron bow loop',(sign*.10,.207,1.385),(.095,.03,.048),lace,'hips',24,16)
        tube('Back apron bow tail',[(sign*.025,.22,1.37),(sign*.078,.27,1.25),(sign*.11,.29,1.21)],.025,lace,'hips')
    sphere('Back apron bow knot',(0,.239,1.385),(.032,.023,.033),lace,'hips',20,12)

    # Three miniature patisserie motifs from the source apron, modelled in relief.
    for index,x in enumerate([-.224,0,.224]):
        p=apron_point(x/.35,.79)
        p.x=x
        p.y-=.021
        sphere('Pastry embroidered base',tuple(p),(.052,.015,.025),pastry,'hips',20,12)
        for n in range(5):
            xx=x+(n-2)*.016
            sphere('Whipped cream stitch',(xx,p.y-.005,p.z+.031),(.017,.016,.021),lace,'hips',16,10)
        if index!=1:
            sphere('Strawberry embroidery',(x,p.y-.021,p.z+.056),(.024,.014,.026),cherry,'hips',20,14)
            sphere('Strawberry leaf',(x+.012,p.y-.024,p.z+.079),(.021,.009,.008),pistachio,'hips',16,10)
        else:
            sphere('Cupcake pink icing',(x,p.y-.015,p.z+.048),(.04,.021,.023),icing,'hips',20,12)
            sphere('Cupcake cherry',(x,p.y-.02,p.z+.075),(.012,.011,.013),cherry,'hips',16,10)
    # Painted ambient creases keep cream cloth readable under the soft studio
    # lights without adding costly real-time shadow passes. Set a white attribute
    # on every other lace mesh so joining them cannot introduce black vertices.
    for obj in api['scene'].objects:
        if obj.type!='MESH' or not obj.data.materials or obj.data.materials[0]!=lace: continue
        attr=obj.data.color_attributes.new(name='Cafe cloth shading',type='FLOAT_COLOR',domain='POINT')
        for vertex,datum in zip(obj.data.vertices,attr.data):
            shade=1.0
            if obj.name=='Cafe apron skirt':
                t=max(0,min(1,(1.409-vertex.co.z)/.42))
                fold=math.sin(vertex.co.x*29)**2
                shade=.96-.085*fold*t-.025*t
            elif 'ruffles' in obj.name:
                shade=.96-.1*math.sin(vertex.co.z*190+vertex.co.x*130)**2
            elif 'petticoat' in obj.name:
                shade=.96-.09*math.sin(math.atan2(vertex.co.x,vertex.co.y/.66)*52)**2
            datum.color=(shade,shade,shade,1)
    return ribbon
