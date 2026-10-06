import bpy
import bmesh
import math
import random
import sys
from pathlib import Path
from mathutils import Vector, Matrix, noise

ROOT = Path(__file__).resolve().parent
RENDER = "--no-render" not in sys.argv
SEED = 7

POT_PROFILE = [
    (0.0, 0.0), (0.038, 0.0), (0.042, 0.004), (0.054, 0.084), (0.058, 0.086),
    (0.061, 0.091), (0.06, 0.097), (0.056, 0.099), (0.052, 0.097), (0.05, 0.078), (0.0, 0.078),
]
SOIL_Z = 0.08

DEEP = (0.11, 0.23, 0.12)
PALE = (0.42, 0.52, 0.36)
EDGE = (0.78, 0.7, 0.26)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    random.seed(SEED)


def material(name, color, roughness, vertex_color=False, sheen=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    if sheen:
        bsdf.inputs["Sheen Weight"].default_value = sheen
    if vertex_color:
        attr = nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Col"
        mat.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def link(name, mesh, mat):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    return obj


def paint(obj, fn):
    layer = obj.data.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    for loop in obj.data.loops:
        layer.data[loop.index].color_srgb = (*fn(obj.data.vertices[loop.vertex_index].co), 1.0)


def smooth(obj, angle=None):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    if angle:
        obj.data.set_sharp_from_angle(angle=math.radians(angle))


def subdivide(obj, levels):
    mod = obj.modifiers.new("Subdivision", "SUBSURF")
    mod.levels = levels
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def build_pot(mat):
    bm = bmesh.new()
    segments = 48
    rings = []
    for r, z in POT_PROFILE:
        ring = []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for i in range(segments):
            j = (i + 1) % segments
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("Plant_Pot")
    bm.to_mesh(mesh)
    bm.free()
    obj = link("Plant_Pot", mesh, mat)
    subdivide(obj, 1)
    smooth(obj, 50)

    def clay(co):
        n = noise.noise(Vector((co.x * 90, co.y * 90, co.z * 90)))
        fine = noise.noise(Vector((co.x * 400, co.y * 400, co.z * 400)))
        base = (0.66, 0.34, 0.2)
        bloom = 0.25 * max(0.0, noise.noise(Vector((co.x * 30, co.y * 30, co.z * 60 + 3))))
        shade = 1.0 + 0.08 * n + 0.04 * fine - 0.12 * (1 - min(1, co.z / 0.02))
        rim = 0.08 if co.z > 0.085 else 0.0
        return tuple(min(1.0, c * shade + rim + bloom * (0.55 - c)) for c in base)

    paint(obj, clay)
    return obj


def build_soil(mat):
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=False, segments=48, radius=0.0505)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=6, use_grid_fill=True)
    for v in bm.verts:
        v.co.z = SOIL_Z + 0.0025 * noise.noise(Vector((v.co.x * 160, v.co.y * 160, 1.3))) - 0.002 * (math.hypot(v.co.x, v.co.y) / 0.05) ** 2
    mesh = bpy.data.meshes.new("Plant_Soil")
    bm.to_mesh(mesh)
    bm.free()
    obj = link("Plant_Soil", mesh, mat)
    smooth(obj)
    paint(obj, lambda co: tuple(c * (0.85 + 0.3 * noise.noise(Vector((co.x * 300, co.y * 300, 0.0)))) for c in (0.24, 0.17, 0.11)))
    return obj


def build_pebbles(mat):
    bm = bmesh.new()
    for _ in range(46):
        r = 0.046 * math.sqrt(random.random())
        a = random.random() * 2 * math.pi
        size = random.uniform(0.0025, 0.0055)
        res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        scale = Vector((size * random.uniform(0.8, 1.3), size * random.uniform(0.7, 1.1), size * random.uniform(0.45, 0.7)))
        rot = Matrix.Rotation(random.random() * math.pi, 4, "Z")
        for v in res["verts"]:
            v.co = rot @ Vector((v.co.x * scale.x, v.co.y * scale.y, v.co.z * scale.z)) + Vector((r * math.cos(a), r * math.sin(a), SOIL_Z + 0.0008))
    mesh = bpy.data.meshes.new("Plant_Pebbles")
    bm.to_mesh(mesh)
    bm.free()
    obj = link("Plant_Pebbles", mesh, mat)
    smooth(obj)
    tones = {}

    def stone(co):
        key = (round(co.x, 2), round(co.y, 2))
        if key not in tones:
            g = random.uniform(0.38, 0.72)
            tones[key] = (g, g * 0.96, g * 0.9)
        return tones[key]

    paint(obj, stone)
    return obj


def leaf_mesh(bm, length, width, lean, yaw, twist, base, seed):
    across = 8
    along = 30
    rows = []
    for j in range(along + 1):
        t = j / along
        profile = width * (math.sin(math.pi * min(1.0, t ** 0.75 * 1.05)) ** 0.55) * (0.55 + 0.45 * math.sin(math.pi * min(1.0, t * 1.6)))
        if t > 0.97:
            profile *= (1 - t) / 0.03
        bend = lean * t ** 1.6
        center = Vector((math.sin(bend) * length * t * 0.6, 0.0, length * t))
        angle = twist * t
        row = []
        for i in range(across + 1):
            u = -1.0 + 2.0 * i / across
            x = u * profile
            channel = -0.22 * profile * (1 - u * u)
            wave = 0.0012 * noise.noise(Vector((u * 2, t * 6, seed)))
            local = Vector((x * math.cos(angle) - (channel + wave) * math.sin(angle), x * math.sin(angle) + (channel + wave) * math.cos(angle), 0.0))
            point = Matrix.Rotation(yaw, 3, "Z") @ (center + local)
            row.append(bm.verts.new(point + base))
        rows.append(row)
    faces = []
    for j in range(along):
        for i in range(across):
            faces.append(bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i])))
    return faces


def build_leaves(mat):
    bm = bmesh.new()
    count = 11
    for k in range(count):
        ring = k / count
        yaw = ring * 2 * math.pi * 1.618 + random.uniform(-0.25, 0.25)
        radius = 0.006 + 0.022 * (k % 3) / 2
        base = Vector((radius * math.cos(yaw), radius * math.sin(yaw), SOIL_Z - 0.01))
        length = random.uniform(0.17, 0.25) * (1.0 - 0.25 * (k % 3) / 2)
        width = random.uniform(0.016, 0.022)
        lean = random.uniform(0.25, 0.7) * (1 + 0.8 * (k % 3) / 2)
        twist = random.uniform(-0.9, 0.9)
        leaf_mesh(bm, length, width, lean, yaw + math.pi / 2, twist, base, k * 3.7)
    mesh = bpy.data.meshes.new("Plant_Leaves")
    bm.to_mesh(mesh)
    bm.free()
    obj = link("Plant_Leaves", mesh, mat)
    solid = obj.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.0022
    solid.offset = 0
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=solid.name)
    obj.select_set(False)
    subdivide(obj, 1)
    smooth(obj)

    def banding(co):
        h = co.z - SOIL_Z
        r = math.hypot(co.x, co.y)
        bands = 0.5 + 0.5 * math.sin(h * 260 + 4 * noise.noise(Vector((co.x * 120, co.y * 120, h * 40))))
        bands = bands ** 2.2 * 0.75
        c = tuple(DEEP[i] * (1 - bands) + PALE[i] * bands for i in range(3))
        edge = noise.noise(Vector((co.x * 900, co.y * 900, h * 900)))
        base_fade = max(0.0, 1.0 - h / 0.03)
        c = tuple(c[i] * (1 - 0.35 * base_fade) + 0.08 * base_fade for i in range(3))
        return tuple(min(1.0, v * (0.95 + 0.1 * edge)) for v in c)

    paint(obj, banding)
    edge_layer = obj.data.color_attributes["Col"]
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    boundary = {v.index for v in bm.verts if v.is_boundary}
    near = set()
    for e in bm.edges:
        if e.verts[0].index in boundary or e.verts[1].index in boundary:
            near.update(v.index for v in e.verts)
    bm.free()
    for loop in obj.data.loops:
        if loop.vertex_index in near:
            edge_layer.data[loop.index].color_srgb = (*EDGE, 1.0)
    return obj


def build():
    reset()
    clay = material("Plant_Terracotta", (1, 1, 1, 1), 0.88, vertex_color=True)
    soil = material("Plant_Soil", (1, 1, 1, 1), 0.98, vertex_color=True)
    stone = material("Plant_Pebbles", (1, 1, 1, 1), 0.7, vertex_color=True)
    leaf = material("Plant_Leaf", (1, 1, 1, 1), 0.42, vertex_color=True, sheen=0.2)
    parts = [build_pot(clay), build_soil(soil), build_pebbles(stone), build_leaves(leaf)]
    for obj in parts:
        obj.data.validate()
    triangles = sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in parts)
    top = max(v.co.z for obj in parts for v in obj.data.vertices)
    print(f"PLANT objects={len(parts)} triangles={triangles} height={top:.3f}")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "plant.blend"))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(ROOT / "plant.glb"),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_vertex_color="MATERIAL",
    )
    if RENDER:
        studio()


def studio():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 700
    scene.render.resolution_y = 900
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.8, 0.82, 0.85, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    scene.world = world
    for name, loc, energy in (("Key", (0.4, -0.35, 0.5), 18), ("Fill", (-0.45, -0.1, 0.25), 6), ("Rim", (0.0, 0.5, 0.4), 12)):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = 0.4
        obj = bpy.data.objects.new(name, light)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 0.12)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(obj)
    camera = bpy.data.cameras.new("Camera")
    camera.lens = 70
    cam = bpy.data.objects.new("Camera", camera)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for label, loc in (("front", (0.0, -0.75, 0.2)), ("three-quarter", (0.45, -0.55, 0.32))):
        cam.location = loc
        cam.rotation_euler = (Vector((0, 0, 0.14)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(ROOT / f"{label}.png")
        bpy.ops.render.render(write_still=True)


build()
