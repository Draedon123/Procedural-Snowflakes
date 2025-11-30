#!import hex
#!import cells

@group(0) @binding(0) var <storage, read_write> cells: Cells;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let axial: vec2i = vec2i(id.xy) - i32(cells.radius);
  if(!isInBounds(axial, cells.radius)){
    return;
  }

  let index: u32 = getCellIndex(axial);
  let cellNeighbours: array<vec2i, 6> = neighbours(axial);

  // as a bool
  var receptive: u32 = select(0u, 1u, getValue(&cells.cells[index]) >= 1.0);
  
  for(var i: u32 = 0; i < 6; i++){
    let neighbour: vec2i = cellNeighbours[i];
    let neighbourIndex: u32 = getCellIndex(neighbour);
    let neighbourValue: f32 = getValue(&cells.cells[neighbourIndex]);

    receptive = max(receptive, select(0u, 1u, neighbourValue >= 1.0));
  }

  cells.cells[index].receptive = receptive;
}
