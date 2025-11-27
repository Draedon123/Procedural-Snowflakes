#!import cells
#!import hex

struct Settings {
  alpha: f32,
  beta: f32,
  gamma: f32,
}

struct RenderCellsSettings {
  maxValue: atomic<u32>,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(1) var <storage, read_write> cells: Cells;
@group(0) @binding(2) var <storage, read_write> renderSettings: RenderCellsSettings;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let axial: vec2i = vec2i(id.xy) - i32(cells.radius);
  if(!isInBounds(axial, i32(cells.radius))){
    return;
  }

  let index: u32 = getCellIndex(axial);
  let cell: Cell = cells.cells[index];
  let cellValue = getValue(&cells.cells[index]);
  let cellNeighbours: array<vec2i, 6> = neighbours(axial);
  var value: f32 = select(0.0, cellValue + settings.gamma, cell.receptive == 1);
  var diffusion: f32 = select(0.5 * cellValue, 0.0, cell.receptive == 1);
  
  for(var i: u32 = 0; i < 6; i++){
    let neighbourPosition: vec2i = cellNeighbours[i];
    let neighbourIndex: u32 = getCellIndex(neighbourPosition);
    let neighbour: Cell = cells.cells[neighbourIndex];
    let neighbourValue: f32 = select(settings.beta, getValue(&cells.cells[neighbourIndex]), isInBounds(neighbourPosition, i32(cells.radius)));
    
    diffusion += select(neighbourValue / 12.0, 0.0, neighbour.receptive == 1);
  }

  let newValue: f32 = value + diffusion;
  let maxValue: f32 = max(bitcast<f32>(atomicLoad(&renderSettings.maxValue)), newValue);
  atomicStore(&renderSettings.maxValue, bitcast<u32>(maxValue));

  setValue(&cells.cells[index], newValue, cells.useValue);
  setDiffusion(&cells.cells[index], diffusion, cells.useValue);
}
