import bpy
import bmesh
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
RENDER = "--no-render" not in sys.argv

LENGTH = 0.114
WIDTH = 0.062
HEIGHT = 0.038
SPLIT_Y = 0.006
SIDE_Z = 0.009
GRIP_X = 0.025
SEAM = 0.0006
WHEEL_Y = 0.024
WHEEL_RADIUS = 0.0105
WHEEL_WIDTH = 0.0068
SLOT_HALF = 0.0048


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness, metallic=0.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if coat:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.2
    return mat


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def half_width(v):
    palm = smoothstep(-1.0, 0.1, -v)
    return WIDTH / 2 * (0.86 + 0.14 * palm) * (1.0 - 0.1 * smoothstep(0.55, 1.0, v))


def top_height(v):
    hump = math.exp(-((v + 0.28) / 0.62) ** 2)
    return HEIGHT * (0.42 + 0.58 * hump) * (1.0 - 0.35 * smoothstep(0.75, 1.0, v))


def shell_deform(p):
    x, y, z = p
    v = y
    w = half_width(v)
    across = x
    if z >= 0:
        crown = 1.0 - 0.18 * across * across
        h = top_height(v) * crown
        zz = 0.004 + (h - 0.004) * (z ** 0.85)
    else:
        zz = 0.004 + 0.004 * z
    side = 1.0 - 0.1 * smoothstep(0.2, 1.0, z)
    return Vector((across * w * side, v * LENGTH / 2, zz))


def quad_shell(name, mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=12, use_grid_fill=True)
    for vert in bm.verts:
        vert.co = shell_deform(vert.co.normalized())
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    subsurf = obj.modifiers.new("Subdivision", "SUBSURF")
    subsurf.levels = 2
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=subsurf.name)
    obj.select_set(False)
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def mesh_from(source, name, mat, cuts):
    bm = bmesh.new()
    bm.from_mesh(source.data)
    for co, normal in cuts:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=normal, clear_outer=True)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def join(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = name
    result.data.name = name
    bm = bmesh.new()
    bm.from_mesh(result.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bm.to_mesh(result.data)
    bm.free()
    return result


def delete_faces(obj, predicate):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    doomed = [f for f in bm.faces if predicate(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()


def build_wheel(mat):
    bm = bmesh.new()
    ribs = 24
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=ribs * 2, radius1=WHEEL_RADIUS, radius2=WHEEL_RADIUS, depth=WHEEL_WIDTH)
    for vert in bm.verts:
        angle = math.atan2(vert.co.y, vert.co.x)
        radial = math.hypot(vert.co.x, vert.co.y)
        if radial > WHEEL_RADIUS * 0.9:
            step = round(angle / (math.pi / ribs))
            groove = 0.00045 if step % 2 else 0.0
            scale = (WHEEL_RADIUS - groove) / radial
            vert.co.x *= scale
            vert.co.y *= scale
    bevel_edges = [e for e in bm.edges if all(math.hypot(v.co.x, v.co.y) > WHEEL_RADIUS * 0.9 for v in e.verts) and abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-7]
    bmesh.ops.bevel(bm, geom=bevel_edges, offset=0.0006, segments=2, affect="EDGES", profile=0.5)
    mesh = bpy.data.meshes.new("Mouse_Wheel")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Mouse_Wheel", mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.set_sharp_from_angle(angle=math.radians(40))
    top = top_height(WHEEL_Y / (LENGTH / 2))
    obj.data.transform(Matrix.Translation((0, WHEEL_Y, top - WHEEL_RADIUS + 0.0022)) @ Matrix.Rotation(math.radians(90), 4, "Y"))
    return obj


def build():
    reset()
    shell_mat = material("Mouse_Shell", (0.075, 0.08, 0.085, 1.0), 0.48, coat=0.12)
    chassis_mat = material("Mouse_Chassis", (0.012, 0.012, 0.013, 1.0), 0.7)
    wheel_mat = material("Mouse_Wheel", (0.32, 0.33, 0.34, 1.0), 0.35, metallic=0.6)

    source = quad_shell("Mouse_Source", shell_mat)
    chassis = quad_shell("Mouse_Chassis", chassis_mat)
    chassis.data.transform(Matrix.Translation((0, 0, -0.0012)) @ Matrix.Diagonal((0.975, 0.985, 0.97, 1.0)))

    up = Vector((0, 0, 1))
    down = Vector((0, 0, -1))
    front = Vector((0, 1, 0))
    back = Vector((0, -1, 0))
    right = Vector((1, 0, 0))
    left = Vector((-1, 0, 0))
    rear = mesh_from(source, "Mouse_Rear", shell_mat, [((0, SPLIT_Y - SEAM, 0), front)])
    lower = mesh_from(source, "Mouse_Lower", shell_mat, [((0, SPLIT_Y - SEAM, 0), back), ((0, 0, SIDE_Z - SEAM), up)])
    grip_l = mesh_from(source, "Mouse_Grip_L", shell_mat, [((0, SPLIT_Y - SEAM, 0), back), ((0, 0, SIDE_Z - SEAM), down), ((-GRIP_X - SEAM, 0, 0), right)])
    grip_r = mesh_from(source, "Mouse_Grip_R", shell_mat, [((0, SPLIT_Y - SEAM, 0), back), ((0, 0, SIDE_Z - SEAM), down), ((GRIP_X + SEAM, 0, 0), left)])
    body = join([rear, lower, grip_l, grip_r], "Mouse_Body")
    buttons = []
    for side, label in ((1, "R"), (-1, "L")):
        button = mesh_from(source, f"Mouse_Button_{label}", shell_mat, [
            ((0, SPLIT_Y + SEAM, 0), back),
            ((0, 0, SIDE_Z + SEAM), down),
            ((side * SEAM, 0, 0), Vector((-side, 0, 0))),
            ((side * (GRIP_X - SEAM), 0, 0), Vector((side, 0, 0))),
        ])
        delete_faces(button, lambda c: abs(c.x) < SLOT_HALF and abs(c.y - WHEEL_Y) < WHEEL_RADIUS * 1.05)
        buttons.append(button)
    bpy.data.objects.remove(source)

    body.data.materials.append(chassis_mat)
    for poly in body.data.polygons:
        if poly.center.z < 0.0045:
            poly.material_index = 1
    feet = []
    for y in (-0.04, 0.035):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(0.03, 0.006, 0.0008), verts=bm.verts)
        bmesh.ops.translate(bm, vec=(0, y, 0.0004), verts=bm.verts)
        mesh = bpy.data.meshes.new("Mouse_Foot")
        bm.to_mesh(mesh)
        bm.free()
        foot = bpy.data.objects.new("Mouse_Foot", mesh)
        bpy.context.collection.objects.link(foot)
        mesh.materials.append(chassis_mat)
        feet.append(foot)

    wheel = build_wheel(wheel_mat)
    parts = [body, *buttons, chassis, wheel, *feet]
    for obj in parts:
        obj.data.validate()
    triangles = sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in parts)
    print(f"MOUSE objects={len(parts)} triangles={triangles}")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "mouse.blend"))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(ROOT / "mouse.glb"),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    if RENDER:
        studio()


def studio():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 800
    scene.render.resolution_y = 600
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.85, 0.85, 0.87, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
    scene.world = world
    for name, loc, energy in (("Key", (0.25, -0.2, 0.3), 6), ("Fill", (-0.3, 0.1, 0.15), 2.5), ("Rim", (0.0, 0.35, 0.2), 5)):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = 0.3
        obj = bpy.data.objects.new(name, light)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 0.02)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(obj)
    camera = bpy.data.cameras.new("Camera")
    camera.lens = 85
    cam = bpy.data.objects.new("Camera", camera)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for label, loc in (("three-quarter", (0.2, 0.26, 0.17)), ("top", (0.0, 0.001, 0.42)), ("side", (0.42, 0.0, 0.05))):
        cam.location = loc
        cam.rotation_euler = (Vector((0, 0, 0.016)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(ROOT / f"{label}.png")
        bpy.ops.render.render(write_still=True)


build()
