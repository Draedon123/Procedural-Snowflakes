struct Settings {
  placeholder: f32,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(1) var output: texture_storage_2d<rgba8unorm, write>;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let coords: vec2f = vec2f(id.xy);
  let _dimensions: vec2u = textureDimensions(output);
  let dimensions: vec2f = vec2f(f32(_dimensions.x), f32(_dimensions.y));

  if(coords.x > dimensions.x || coords.y > dimensions.y){
    return;
  }

  textureStore(output, id.xy, vec4f(coords / dimensions, 0.0, 1.0));
}
