import bpy
import math
import sys
from pathlib import Path
import numpy as np
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source.glb"
TARGET_HEIGHT = 1.9
RENDER = "--no-render" not in sys.argv

PARTS = {
    "Object_6": ("Pikachu_Body", "Pikachu_Fur", 0.75, 1),
    "Object_11": ("Pikachu_Hat", "Pikachu_Hat", 0.0, 1),
    "PikachuToothSkin_Body_0": ("Pikachu_Mouth", "Pikachu_Mouth", 0.0, 1),
    "Object_8": ("Pikachu_Iris_R", "Pikachu_Eye", 0.0, 2),
    "Object_9": ("Pikachu_Iris_L", "Pikachu_Eye", 0.0, 2),
}
ROUGHNESS = {"Pikachu_Fur": 0.8, "Pikachu_Hat": 0.75, "Pikachu_Mouth": 0.5, "Pikachu_Eye": 0.12}


def texture_of(obj):
    mat = obj.data.materials[0]
    for node in mat.node_tree.nodes:
        if node.type == "TEX_IMAGE" and any(link.to_socket.name == "Base Color" for link in node.outputs[0].links):
            image = node.image
            pixels = np.array(image.pixels[:], dtype=np.float32).reshape(image.size[1], image.size[0], image.channels)
            return pixels[:, :, :3]
    return None


def sample(pixels, u, v):
    h, w, _ = pixels.shape
    x = (u % 1.0) * (w - 1)
    y = (v % 1.0) * (h - 1)
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    x1 = np.minimum(x0 + 1, w - 1)
    y1 = np.minimum(y0 + 1, h - 1)
    fx = (x - x0)[:, None]
    fy = (y - y0)[:, None]
    top = pixels[y0, x0] * (1 - fx) + pixels[y0, x1] * fx
    bottom = pixels[y1, x0] * (1 - fx) + pixels[y1, x1] * fx
    return top * (1 - fy) + bottom * fy


def material(name):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = ROUGHNESS[name]
    if not any(n.type == "VERTEX_COLOR" for n in nodes):
        attr = nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Col"
        mat.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def bake_part(source, name, mat_name, fur, levels):
    pixels = texture_of(source)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = source.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
    mesh.transform(source.matrix_world)
    mesh.name = name
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.clear()
    mesh.materials.append(material(mat_name))
    if levels:
        mod = obj.modifiers.new("Subdivision", "SUBSURF")
        mod.levels = levels
        mod.uv_smooth = "PRESERVE_BOUNDARIES"
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.select_set(False)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    uv_layer = obj.data.uv_layers.active.data
    count = len(obj.data.loops)
    uvs = np.empty(count * 2, dtype=np.float32)
    uv_layer.foreach_get("uv", uvs)
    uvs = uvs.reshape(count, 2)
    rgb = sample(pixels, uvs[:, 0], uvs[:, 1]) if pixels is not None else np.full((count, 3), 0.8, dtype=np.float32)
    colors = np.concatenate([rgb, np.full((count, 1), fur, dtype=np.float32)], axis=1).ravel()
    layer = obj.data.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    layer.data.foreach_set("color_srgb", colors)
    return obj


def normalize(objects):
    points = [v.co for obj in objects for v in obj.data.vertices]
    lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    factor = TARGET_HEIGHT / (hi.z - lo.z)
    transform = Matrix.Scale(factor, 4) @ Matrix.Translation(-(lo + hi) / 2)
    for obj in objects:
        obj.data.transform(transform)
    return (hi - lo) * factor


ARM_BONES = ("trLArm_0110", "trRArm_0130")
ARM_DROP = math.radians(42)
ARM_FORWARD = math.radians(38)


def relax_arms():
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    world = armature.matrix_world
    for name in ARM_BONES:
        bone = armature.pose.bones[name]
        head = world @ bone.head
        side = 1 if head.x > 0 else -1
        turn = Matrix.Rotation(-side * ARM_FORWARD, 4, "Z") @ Matrix.Rotation(side * ARM_DROP, 4, "Y")
        pivot = Matrix.Translation(head) @ turn @ Matrix.Translation(-head)
        bone.matrix = world.inverted() @ pivot @ world @ bone.matrix
        bpy.context.view_layer.update()


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    relax_arms()
    sources = {obj.name: obj for obj in bpy.context.scene.objects}
    parts = [bake_part(sources[key], *spec) for key, spec in PARTS.items()]
    for obj in list(bpy.context.scene.objects):
        if obj not in parts:
            bpy.data.objects.remove(obj, do_unlink=True)
    dims = normalize(parts)
    triangles = sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in parts)
    print(f"DETECTIVE objects={len(parts)} triangles={triangles} dims={tuple(round(d, 3) for d in dims)}")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "detective-pikachu.blend"))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(ROOT / "pikachu.glb"),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_texcoords=False,
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
    scene.render.resolution_y = 800
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.8, 0.8, 0.82, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    scene.world = world
    camera = bpy.data.cameras.new("Camera")
    camera.lens = 85
    cam = bpy.data.objects.new("Camera", camera)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for label, angle in (("front", 0), ("side", 90), ("back", 180), ("left", 270)):
        a = math.radians(angle)
        cam.location = (math.sin(a) * 7.5, -math.cos(a) * 7.5, 0.4)
        cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(ROOT / f"{label}.png")
        bpy.ops.render.render(write_still=True)


build()
