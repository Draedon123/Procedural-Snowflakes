#!import cells

struct Settings {
  placeholder: f32,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(0) var <storage> cells: Cells;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let axial: vec2i = vec2i(id.xy) - cells.radius;
  if(abs(axial.x) > cells.radius || abs(axial.y) > cell.radius){
    return;
  }

  let index: u32 = getCellIndex(axial);
  
}
