import bpy
import bmesh
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parent
TARGET_HEIGHT = 1.9
RENDER = "--no-render" not in sys.argv

YELLOW = (0.86, 0.52, 0.04, 1.0)
YELLOW_DEEP = (0.8, 0.46, 0.03, 1.0)
BELLY = (0.56, 0.38, 0.17, 1.0)
BLACK = (0.01, 0.008, 0.008, 1.0)
BROWN = (0.22, 0.09, 0.03, 1.0)
STRIPE = (0.25, 0.1, 0.03, 1.0)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for item in list(collection):
            collection.remove(item)


def material(name, color, roughness, vertex_color=False, sheen=0.0, emission=None, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    if sheen:
        bsdf.inputs["Sheen Weight"].default_value = sheen
        bsdf.inputs["Sheen Tint"].default_value = (1.0, 0.75, 0.2, 1.0)
    if coat:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.05
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = 1.0
    if vertex_color:
        attr = nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Col"
        links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def quad_sphere(name, cuts, deform, mat, color_fn=None, levels=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        p = v.co.normalized()
        v.co = deform(p)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    subdivide(obj, levels)
    if color_fn:
        mesh = obj.data
        layer = mesh.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        for loop in mesh.loops:
            co = mesh.vertices[loop.vertex_index].co
            layer.data[loop.index].color = color_fn(co)
    return obj


def subdivide(obj, levels):
    mod = obj.modifiers.new("Subdivision", "SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)
    for poly in obj.data.polygons:
        poly.use_smooth = True


def place(obj, location=(0, 0, 0), rotation=(0, 0, 0)):
    obj.location = location
    obj.rotation_euler = Euler([math.radians(a) for a in rotation])
    bpy.context.view_layer.update()
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))


def fur(color, length):
    return (color[0], color[1], color[2], length)


HEAD_CENTER = Vector((0.0, 0.0, 1.47))


def half_width(h):
    tb = (h - 0.58) / 0.6
    body = 0.62 * max(0.0, 1.0 - abs(tb) ** 2.4) ** 0.42 * (1.0 + 0.08 * (0.6 - h))
    th = (h - 1.47) / 0.52
    exponent = 2.0 if th < 0 else 2.3
    head = 0.64 * max(0.0, 1.0 - abs(th) ** exponent) ** (1.0 / exponent)
    head *= 1.0 + 0.07 * math.exp(-((h - 1.3) / 0.11) ** 2)
    k = 0.15
    return (body + head + math.sqrt((body - head) ** 2 + k * k)) / 2 - k / 2


def torso_deform(p):
    x, y, z = p
    h = 0.995 + 0.995 * z
    radius = half_width(h)
    ring = math.hypot(x, y)
    if ring < 1e-6:
        return Vector((0.0, 0.0, h))
    head = smoothstep(0.9, 1.15, h)
    depth = 0.86 + 0.05 * head
    if y < 0:
        depth *= 0.95 if head > 0.5 else 1.05
    return Vector((x / ring * radius, y / ring * radius * depth, h))


def torso_color(co):
    front = smoothstep(-0.2, -0.42, co.y)
    band = smoothstep(0.08, 0.3, co.z) * smoothstep(0.85, 0.55, co.z)
    side = smoothstep(0.42, 0.12, abs(co.x))
    color = mix(YELLOW, BELLY, front * band * side * 0.9)
    back = smoothstep(0.05, 0.3, co.y)
    for height, half, reach in ((0.98, 0.065, 0.52), (0.7, 0.07, 0.6)):
        across = smoothstep(reach, reach * 0.55, abs(co.x))
        wave = height + 0.035 * math.cos(co.x * 5.0)
        stripe = smoothstep(half, half * 0.45, abs(co.z - wave)) * back * across
        color = mix(color, STRIPE, stripe)
    facing = smoothstep(-0.18, -0.4, co.y)
    face = facing * smoothstep(1.12, 1.25, co.z) * smoothstep(1.85, 1.7, co.z) * smoothstep(0.55, 0.4, abs(co.x))
    ruff = facing * smoothstep(0.78, 0.92, co.z) * smoothstep(1.2, 1.06, co.z)
    length = 0.72 + 0.28 * ruff
    length = length * (1.0 - face) + 0.32 * face
    return fur(color, length)


def ear_deform(p):
    x, y, z = p
    t = (z + 1.0) / 2.0
    taper = (1.0 - 0.86 * t ** 1.6) * (0.75 + 0.25 * math.sin(min(1.0, t * 2.6) * math.pi * 0.5))
    x *= 0.18 * taper
    y *= 0.095 * taper
    if y > 0:
        y *= 0.7
    return Vector((x, y - 0.3 * x * x, z * 0.5))


def ear_color(co):
    return fur(mix(YELLOW, BLACK, smoothstep(0.06, 0.1, co.z)), 0.5)


def limb_deform(rx, ry, rz):
    def deform(p):
        x, y, z = p
        bulge = 1.0 + 0.18 * smoothstep(0.0, -1.0, z)
        return Vector((x * rx * bulge, y * ry * bulge, z * rz))
    return deform


def limb(name, start, end, r0, r1, mat, length):
    start = Vector(start)
    end = Vector(end)
    axis = end - start
    half = axis.length / 2

    def deform(p):
        t = (p.z + 1.0) / 2.0
        r = r0 + (r1 - r0) * t
        return Vector((p.x * r, p.y * r, p.z * (half + r * 0.6)))

    obj = quad_sphere(name, 5, deform, mat, lambda co: fur(YELLOW_DEEP, length), levels=1)
    rotation = axis.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    obj.data.transform(Matrix.Translation((start + end) / 2) @ rotation)
    return obj


def blob(name, center, radii, mat, length, rotation=(0, 0, 0), cuts=4):
    obj = quad_sphere(name, cuts, lambda p: Vector((p.x * radii[0], p.y * radii[1], p.z * radii[2])), mat, lambda co: fur(YELLOW_DEEP, length), levels=1)
    place(obj, center, rotation)
    return obj


def build_body(mat):
    torso = quad_sphere("Pikachu_Body", 12, torso_deform, mat, torso_color)
    parts = [torso]
    for side in (-1, 1):
        tag = "L" if side > 0 else "R"
        ear = quad_sphere(f"Pikachu_Ear_{tag}", 6, ear_deform, mat, ear_color, levels=1)
        place(ear, (side * 0.52, 0.08, 2.02), (10, side * 42, side * -12))
        shoulder = Vector((side * 0.33, -0.3, 0.98))
        paw = Vector((side * 0.22, -0.6, 0.66))
        arm = limb(f"Pikachu_Arm_{tag}", shoulder, paw, 0.11, 0.125, mat, 0.6)
        foot = blob(f"Pikachu_Foot_{tag}", (side * 0.34, -0.36, 0.06), (0.12, 0.17, 0.07), mat, 0.32, (0, 0, side * -16))
        parts += [ear, arm, foot]
        turn = Matrix.Rotation(math.radians(side * -16), 3, "Z")
        for toe in (-1, 0, 1):
            offset = turn @ Vector((toe * 0.055, -0.15, 0.0))
            parts.append(blob(f"Pikachu_Toe_{tag}{toe + 1}", Vector((side * 0.34, -0.36, 0.07)) + offset, (0.035, 0.04, 0.032), mat, 0.2, cuts=3))
        for finger in (-1, 0, 1):
            reach = (paw - shoulder).normalized()
            tip = paw + reach * 0.07 + Vector((finger * 0.05, -0.06, 0.0))
            parts.append(blob(f"Pikachu_Finger_{tag}{finger + 1}", tip, (0.032, 0.04, 0.036), mat, 0.3, cuts=3))
    return parts


TAIL_LEFT = [(0.0, 0.0), (0.06, 0.43), (0.24, 0.39), (0.29, 0.64), (0.47, 0.6), (0.42, 1.06)]
TAIL_RIGHT = [(0.11, 0.0), (0.17, 0.22), (0.37, 0.18), (0.44, 0.43), (0.64, 0.38), (0.83, 1.02)]
TAIL_SPAN_ROWS = 3
TAIL_COLUMNS = 4


def tail_grid(scale):
    rows = []
    for i in range(len(TAIL_LEFT) - 1):
        steps = TAIL_SPAN_ROWS + (1 if i == len(TAIL_LEFT) - 2 else 0)
        for j in range(steps):
            t = j / TAIL_SPAN_ROWS
            left = Vector(TAIL_LEFT[i]).lerp(Vector(TAIL_LEFT[i + 1]), t)
            right = Vector(TAIL_RIGHT[i]).lerp(Vector(TAIL_RIGHT[i + 1]), t)
            rows.append([left.lerp(right, c / TAIL_COLUMNS) * scale for c in range(TAIL_COLUMNS + 1)])
    return rows


def build_tail(mat):
    bm = bmesh.new()
    rows = tail_grid(1.0)
    grid = [[bm.verts.new((p.x, 0.0, p.y)) for p in row] for row in rows]
    for r in range(len(grid) - 1):
        for c in range(TAIL_COLUMNS):
            bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]))
    result = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    moved = [e for e in result["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0.15, 0), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.translate(bm, vec=(0, -0.075, 0), verts=bm.verts[:])
    for v in bm.verts:
        v.co.y *= 0.55 + 0.45 * smoothstep(0.0, 0.35, v.co.z)
    creased = [e for e in bm.edges if len(e.link_faces) == 2 and e.link_faces[0].normal.dot(e.link_faces[1].normal) < 0.5]
    mesh = bpy.data.meshes.new("Pikachu_Tail")
    bm.to_mesh(mesh)
    crease_ids = {e.index for e in creased}
    bm.free()
    crease = mesh.attributes.new("crease_edge", "FLOAT", "EDGE")
    for edge in mesh.edges:
        crease.data[edge.index].value = 0.75 if edge.index in crease_ids else 0.0
    obj = bpy.data.objects.new("Pikachu_Tail", mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    subdivide(obj, 2)
    mesh = obj.data
    layer = mesh.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    for loop in mesh.loops:
        z = mesh.vertices[loop.vertex_index].co.z
        layer.data[loop.index].color = fur(mix(BROWN, YELLOW, smoothstep(0.17, 0.2, z)), 1.0)
    place(obj, (0.18, 0.5, 0.36), (0, -12, 58))
    return obj


def head_bvh(head):
    return BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())


def surface_hit(bvh, direction, through=None):
    direction = Vector(direction).normalized()
    target = HEAD_CENTER if through is None else Vector(through)
    origin = target - direction * 4.0
    hit, normal, _, _ = bvh.ray_cast(origin, direction)
    return hit, normal


def decal(name, mat, bvh, direction, size, depth, sink, through=None, cuts=4, lift=0.0, offset=(0, 0)):
    hit, normal = surface_hit(bvh, direction, through)
    obj = quad_sphere(name, cuts, lambda p: Vector((p.x * size[0], p.y * size[1], p.z * depth)), mat, levels=1)
    rotation = normal.to_track_quat("Z", "Y").to_matrix().to_4x4()
    tangent_x = rotation.col[0].xyz
    tangent_y = rotation.col[1].xyz
    location = hit + normal * (depth * (1.0 - sink) + lift) + tangent_x * offset[0] + tangent_y * offset[1]
    obj.data.transform(Matrix.Translation(location) @ rotation)
    return obj


def build_face(head):
    bvh = head_bvh(head)
    eye = material("Pikachu_Eye", (0.02, 0.015, 0.012, 1.0), 0.12, coat=1.0)
    iris = material("Pikachu_Iris", (0.32, 0.17, 0.05, 1.0), 0.25, coat=1.0)
    shine = material("Pikachu_Shine", (1.0, 1.0, 1.0, 1.0), 0.2, emission=(1.0, 1.0, 1.0, 1.0))
    cheek = material("Pikachu_Cheek", (0.8, 0.04, 0.03, 1.0), 0.65, sheen=0.3)
    dark = material("Pikachu_Mouth", (0.16, 0.06, 0.03, 1.0), 0.5)
    parts = []
    for side in (-1, 1):
        tag = "L" if side > 0 else "R"
        through = (side * 0.29, 0.0, 1.48)
        direction = (0, 1, 0)
        parts.append(decal(f"Pikachu_Iris_{tag}", iris, bvh, direction, (0.1, 0.11), 0.032, 0.55, through))
        parts.append(decal(f"Pikachu_Eye_{tag}", eye, bvh, direction, (0.078, 0.088), 0.032, 0.4, through, lift=0.004, offset=(0, 0.008)))
        parts.append(decal(f"Pikachu_Shine_{tag}", shine, bvh, direction, (0.034, 0.034), 0.012, 0.0, through, lift=0.02, offset=(-0.026, 0.036)))
        parts.append(decal(f"Pikachu_Cheek_{tag}", cheek, bvh, (-side * 1.1, 1.0, 0.1), (0.12, 0.11), 0.03, 0.6, (side * 0.44, 0.0, 1.32)))
    parts.append(decal("Pikachu_Nose", dark, bvh, (0, 1, 0), (0.022, 0.016), 0.014, 0.3, (0, 0.0, 1.37)))
    parts.append(build_mouth(bvh, dark))
    return parts


def build_mouth(bvh, mat):
    points = []
    for i in range(33):
        u = -1.0 + 2.0 * i / 32
        x = 0.075 * u
        z = 1.315 - 0.03 * abs(math.sin(math.pi * u)) + 0.006 * abs(u)
        hit, normal = surface_hit(bvh, (0, 1, 0), (x, 0.0, z))
        points.append(hit + normal * 0.004)
    curve = bpy.data.curves.new("Pikachu_Mouth", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.0085
    curve.bevel_resolution = 2
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1.0)
    obj = bpy.data.objects.new("Pikachu_Mouth", curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def normalize(objects):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for obj in objects:
        for v in obj.data.vertices:
            lo = Vector(map(min, lo, v.co))
            hi = Vector(map(max, hi, v.co))
    center = (lo + hi) / 2
    factor = TARGET_HEIGHT / (hi.z - lo.z)
    transform = Matrix.Scale(factor, 4) @ Matrix.Translation(-center)
    for obj in objects:
        obj.data.transform(transform)
        obj.data.update()
    return (hi - lo) * factor


def studio(objects):
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.9, 0.9, 0.92, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    scene.world = world
    studio_collection = bpy.data.collections.new("Studio")
    scene.collection.children.link(studio_collection)
    for name, loc, energy, size in (("Key", (2.5, -3.5, 3.0), 900, 3), ("Fill", (-3.5, -2.0, 1.0), 350, 4), ("Rim", (0.5, 4.0, 3.0), 700, 2)):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = size
        obj = bpy.data.objects.new(name, light)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        studio_collection.objects.link(obj)
    camera = bpy.data.cameras.new("Camera")
    camera.lens = 85
    cam = bpy.data.objects.new("Camera", camera)
    studio_collection.objects.link(cam)
    scene.camera = cam
    return cam


def render(cam, name, angle, elevation=8):
    distance = 7.6
    a = math.radians(angle)
    e = math.radians(elevation)
    cam.location = (math.sin(a) * distance * math.cos(e), -math.cos(a) * distance * math.cos(e), math.sin(e) * distance)
    cam.rotation_euler = (Vector((0, 0, 0.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.render.filepath = str(ROOT / f"{name}.png")
    bpy.ops.render.render(write_still=True)


def main():
    reset()
    fur_material = material("Pikachu_Fur", YELLOW, 0.78, vertex_color=True, sheen=0.35)
    parts = build_body(fur_material)
    parts.append(build_tail(fur_material))
    parts += build_face(parts[0])
    dims = normalize(parts)
    for obj in parts:
        obj.data.validate()
    triangles = sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in parts)
    ngons = sum(1 for obj in parts if obj.name != "Pikachu_Mouth" for p in obj.data.polygons if len(p.vertices) != 4)
    print(f"PIKACHU objects={len(parts)} triangles={triangles} non_quads={ngons} dims={tuple(round(d, 3) for d in dims)}")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "pikachu.blend"))
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in parts)
    bpy.ops.export_scene.gltf(
        filepath=str(ROOT / "pikachu.glb"),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_vertex_color="MATERIAL",
    )
    if RENDER:
        cam = studio(parts)
        render(cam, "front", 0)
        render(cam, "three-quarter", 35)
        render(cam, "side", 90)
        render(cam, "back", 160)
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "pikachu.blend"))


main()
