#!import hex
#!import cells

struct Settings {
  placeholder: f32,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(1) var <storage, read_write> cells: Cells;
@group(0) @binding(2) var output: texture_storage_2d<rgba8unorm, write>;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let coords: vec2f = vec2f(id.xy);
  let _dimensions: vec2u = textureDimensions(output);
  let dimensions: vec2f = vec2f(f32(_dimensions.x), f32(_dimensions.y));

  if(coords.x > dimensions.x || coords.y > dimensions.y){
    return;
  }

  let centredPixelCoordinates: vec2i = vec2i(coords) - vec2i(0.5 * dimensions);
  let hexRadius: f32 = min(dimensions.x, dimensions.y) / f32(3 * cells.radius);
  let hexCoordinates: vec2i = pixelToHex(centredPixelCoordinates, hexRadius);

  if(!isInBounds(hexCoordinates, i32(cells.radius))){
    return;
  }

  let cellIndex: u32 = getCellIndex(hexCoordinates);

  textureStore(output, id.xy, vec4f(vec3f(0.7, 0.85, 1.0) * vec3f(getValue(&cells.cells[cellIndex])), 1.0));
}
