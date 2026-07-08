export const VANILLA_SHERMAN_GLB_URL = './tftm/models/vanilla_sherman_combined/vanilla_sherman.glb';

export const SHERMAN_DEFAULT_TEXTURE_BASE_URL = './model-assay/sherman_default_texture_set_v1/';

export const SHERMAN_DEFAULT_OLIVE_ALBEDO_URL = SHERMAN_DEFAULT_TEXTURE_BASE_URL + 'olive_albedo.png';
export const SHERMAN_DEFAULT_TREAD_ALBEDO_URL = SHERMAN_DEFAULT_TEXTURE_BASE_URL + 'tread_albedo.png';

export const AUTHORED_SHERMAN_RETOPO_GLB_URL = './tftm/models/authored_sherman_retopo_v1/authored_sherman_retopo_v1.glb';
export const AUTHORED_SHERMAN_RETOPO_TEXTURE_BASE_URL = './tftm/models/authored_sherman_retopo_v1/texture_plates/';
export const AUTHORED_SHERMAN_RETOPO_FACE_PLATES = [
  'hull_glacis',
  'hull_left',
  'hull_right',
  'hull_rear',
  'engine_deck',
  'turret_front',
  'turret_left',
  'turret_right',
  'turret_top',
  'mantlet',
  'barrel_strip',
  'track_outer',
  'track_inner_top_bottom',
  'wheel_disc',
  'bogie_side'
] as const;

export const AUTHORED_SHERMAN_BOXMODEL_GLB_URL = './tftm/models/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.glb?v=v1-15-cast-turret-readable-wheels';
export const AUTHORED_SHERMAN_BOXMODEL_TEXTURE_BASE_URL = './tftm/models/authored_sherman_boxmodel_v1/texture_plates/';
export const AUTHORED_SHERMAN_BOXMODEL_FACE_PLATES = [
  'hull_glacis',
  'hull_left',
  'hull_right',
  'hull_rear',
  'engine_deck',
  'turret_front',
  'turret_left',
  'turret_right',
  'turret_top',
  'turret_bustle',
  'mantlet',
  'barrel_strip',
  'coaxial_mg',
  'track_outer',
  'track_inner_top_bottom',
  'wheel_disc',
  'bogie_side'
] as const;


export const AUTHORED_SHERMAN_TEXTUREABLE_GLB_URL = './tftm/models/authored_sherman_textureable_v1/authored_sherman_textureable_v1.glb?v=v1-1-contained-running-gear-textureable';
export const AUTHORED_SHERMAN_TEXTUREABLE_TEXTURE_BASE_URL = './tftm/models/authored_sherman_textureable_v1/texture_plates/';
export const AUTHORED_SHERMAN_TEXTUREABLE_FACE_PLATES = [
  'hull_glacis',
  'hull_left',
  'hull_right',
  'hull_rear',
  'engine_deck',
  'turret_front',
  'turret_left',
  'turret_right',
  'turret_top',
  'turret_bustle',
  'mantlet',
  'barrel_strip',
  'coaxial_mg',
  'track_outer',
  'track_inner_top_bottom',
  'wheel_disc',
  'bogie_side'
] as const;

export const AUTHORED_SHERMAN_TREADS_GLB_URL = './tftm/models/authored_sherman_treads_v1/authored_sherman_treads_v1.glb?v=v1-9-inner-sidewall-socket-fit';

export const AUTHORED_SHERMAN_CHASSIS_GLB_URL = './tftm/models/authored_sherman_chassis_v1/authored_sherman_chassis_v1.glb?v=v1-4-hd-surface-detail-material-ids';

export const AUTHORED_SHERMAN_TURRET_GLB_URL = './tftm/models/authored_sherman_turret_v1/authored_sherman_turret_v1.glb?v=v1-13-hd-surface-detail-material-ids';

export const MESHY_SHERMAN_TURRET_KIT_BASE_URL = './tftm/models/meshy_sherman_turret_kit_v2/';
const MESHY_SHERMAN_TURRET_KIT_CACHE = '?v=v2-meshy-kit-pbr-edge-grime-20260707';
export const MESHY_SHERMAN_TURRET_KIT_MANIFEST_URL = MESHY_SHERMAN_TURRET_KIT_BASE_URL + 'model_manifest.json' + MESHY_SHERMAN_TURRET_KIT_CACHE;
export const MESHY_SHERMAN_TURRET_SHELL_GLB_URL = MESHY_SHERMAN_TURRET_KIT_BASE_URL + 'turret_shell.glb' + MESHY_SHERMAN_TURRET_KIT_CACHE;
export const MESHY_SHERMAN_MANTLET_SOCKET_GLB_URL = MESHY_SHERMAN_TURRET_KIT_BASE_URL + 'mantlet_socket.glb' + MESHY_SHERMAN_TURRET_KIT_CACHE;
export const MESHY_SHERMAN_BARREL_GLB_URL = MESHY_SHERMAN_TURRET_KIT_BASE_URL + 'barrel.glb' + MESHY_SHERMAN_TURRET_KIT_CACHE;
export const MESHY_SHERMAN_COAX_GLB_URL = MESHY_SHERMAN_TURRET_KIT_BASE_URL + 'coax.glb' + MESHY_SHERMAN_TURRET_KIT_CACHE;
export const MESHY_SHERMAN_HATCH_GLB_URL = MESHY_SHERMAN_TURRET_KIT_BASE_URL + 'hatch.glb' + MESHY_SHERMAN_TURRET_KIT_CACHE;
export const MESHY_SHERMAN_BLACK_INTERIOR_GLB_URL = MESHY_SHERMAN_TURRET_KIT_BASE_URL + 'black_interior.glb' + MESHY_SHERMAN_TURRET_KIT_CACHE;


export const MESHY_SHERMAN_COMPONENT_ASSEMBLY_BASE_URL = './tftm/models/meshy_sherman_component_assembly_v1/';
const MESHY_SHERMAN_COMPONENT_ASSEMBLY_CACHE = '?v=v1-welded-component-editor-kit-20260708';
export const MESHY_SHERMAN_COMPONENT_ASSEMBLY_MANIFEST_URL = MESHY_SHERMAN_COMPONENT_ASSEMBLY_BASE_URL + 'component_manifest.json' + MESHY_SHERMAN_COMPONENT_ASSEMBLY_CACHE;

export const AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL = './tftm/textures/authored_sherman_smart_material_v1/';
export const AUTHORED_SHERMAN_SHARED_TEXTURE_SET_ID = 'authored_sherman_smart_material_v1_armored_tread_plate_mapping_20260706';
const AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE = '?v=armored-tread-plates-pbr-edge-grime-v8-20260707';
export const AUTHORED_SHERMAN_SHARED_ARMOR_ALBEDO_URL = AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL + 'armor_base.png' + AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_SHARED_TREAD_ALBEDO_URL = AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL + 'tread_wear.png' + AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_SHARED_WHEEL_ALBEDO_URL = AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL + 'wheel_wear.png' + AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_SHARED_GUN_ALBEDO_URL = AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL + 'gun_finish.png' + AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_SHARED_EDGE_WEAR_URL = AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL + 'edge_wear.png' + AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_SHARED_CAVITY_GRIME_URL = AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL + 'cavity_grime.png' + AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_SHARED_DUST_MUD_URL = AUTHORED_SHERMAN_SHARED_TEXTURE_BASE_URL + 'dust_mud.png' + AUTHORED_SHERMAN_SHARED_TEXTURE_CACHE;

export const AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID = 'authored_sherman_runtime_tread_shoe_v3_matte_detail_roughness_20260707';
export const AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_BASE_URL = './tftm/textures/authored_sherman_runtime_tread_shoe_v1/';
const AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_CACHE = '?v=matte-detail-roughness-v3-20260707';
export const AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ALBEDO_URL = AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_BASE_URL + 'tread_shoe_albedo.png' + AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_NORMAL_URL = AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_BASE_URL + 'tread_shoe_normal.png' + AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ROUGHNESS_URL = AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_BASE_URL + 'tread_shoe_roughness.png' + AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_METALNESS_URL = AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_BASE_URL + 'tread_shoe_metalness.png' + AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_CACHE;


export const AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_SET_ID = 'authored_sherman_runtime_armor_pbr_v1_edge_grime_matte_metal_20260707';
export const AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_BASE_URL = './tftm/textures/authored_sherman_runtime_armor_pbr_v1/';
const AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_CACHE = '?v=edge-grime-matte-metal-20260707';
export const AUTHORED_SHERMAN_RUNTIME_ARMOR_NORMAL_URL = AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_BASE_URL + 'armor_overlay_normal.png' + AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_ARMOR_ROUGHNESS_URL = AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_BASE_URL + 'armor_overlay_roughness.png' + AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_ARMOR_METALNESS_URL = AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_BASE_URL + 'armor_overlay_metalness.png' + AUTHORED_SHERMAN_RUNTIME_ARMOR_PBR_TEXTURE_CACHE;

export const AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID = 'authored_sherman_runtime_wheel_v2_pbr_edge_grime_contact_20260707';
export const AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_BASE_URL = './tftm/textures/authored_sherman_runtime_wheel_v1/';
const AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_CACHE = '?v=pbr-edge-grime-contact-20260707';
export const AUTHORED_SHERMAN_RUNTIME_WHEEL_ALBEDO_URL = AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_BASE_URL + 'wheel_contact_albedo.png' + AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_WHEEL_NORMAL_URL = AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_BASE_URL + 'wheel_contact_normal.png' + AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_WHEEL_ROUGHNESS_URL = AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_BASE_URL + 'wheel_contact_roughness.png' + AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_CACHE;
export const AUTHORED_SHERMAN_RUNTIME_WHEEL_METALNESS_URL = AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_BASE_URL + 'wheel_contact_metalness.png' + AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_CACHE;


export const SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_SET_ID = 'sherman_hybrid_meshy_hull_material_v1_baked_reference_masks_20260707';
export const SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL = './tftm/textures/sherman_hybrid_meshy_hull_material_v1/';
const SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE = '?v=hull-material-v1-baked-reference-masks-20260707';
export const SHERMAN_HYBRID_HULL_MATERIAL_ALBEDO_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_albedo.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_NORMAL_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_normal.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_ROUGHNESS_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_roughness.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_METALNESS_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_metalness.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_EDGE_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_edge_mask.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_GRIME_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_grime_mask.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_DUST_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_dust_mask.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_WEAR_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_wear_mask.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;
export const SHERMAN_HYBRID_HULL_MATERIAL_REFERENCE_URL = SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_BASE_URL + 'hull_reference_mask.png' + SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_CACHE;

export const SHERMAN_HYBRID_MESHY_HULL_LOWPOLY_GLB_URL = './tftm/models/sherman_hybrid_meshy_hull_lowpoly_v1/sherman_hybrid_meshy_hull_lowpoly_v1.glb?v=v1-meshy-lowpoly-hull-material-v1-20260707';

export const SHERMAN_HYBRID_HULL_TREADS_FIT_GLB_URL = './tftm/models/sherman_hybrid_hull_treads_fit_v1/sherman_hybrid_hull_treads_fit_v1.glb?v=v1-1-exported-sidewall-sponson-fit';
