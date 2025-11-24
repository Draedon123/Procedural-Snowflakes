#!import hex

struct Settings {
  placeholder: f32,
}

struct Cells {
  // axial coordinates
  radius: u32,
  cells: array<Cell>,
}

struct Cell {
  value: f32,
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
  let hexRadius: f32 = 0.95 * min(dimensions.x, dimensions.y) / f32(2 * cells.radius);
  let hexCoordinates: vec2i = pixelToHex(centredPixelCoordinates, hexRadius);
  let uncentredHexCoordinates: vec2u = vec2u(hexCoordinates + i32(cells.radius));
  let cellIndex: u32 = uncentredHexCoordinates.x + 2 * cells.radius * uncentredHexCoordinates.y;
  let cellValue = select(0.0, 1.0, hexCoordinates.x == 0 && hexCoordinates.y == 0);

  textureStore(output, id.xy, vec4f(vec3f(cellValue), 1.0));
}
