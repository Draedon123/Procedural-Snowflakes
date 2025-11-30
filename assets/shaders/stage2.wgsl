#!import hex
#!import cells
#!import settings

@group(0) @binding(0) var <uniform> settings: SnowflakeSettings;
@group(0) @binding(1) var <storage, read_write> cells: Cells;
@group(0) @binding(2) var <storage, read_write> renderSettings: RenderCellsSettings;
// as a bool
@group(0) @binding(3) var <storage, read_write> finished: u32;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let axial: vec2i = vec2i(id.xy) - i32(cells.radius);
  if(!isInBounds(axial, cells.radius) || finished == 1){
    return;
  }

  let index: u32 = getCellIndex(axial);
  let cell: Cell = cells.cells[index];
  let cellValue = getValue(&cells.cells[index]);
  let cellNeighbours: array<vec2i, 6> = neighbours(axial);
  var value: f32 = select(0.0, cellValue + settings.gamma, cell.receptive == 1);
  let initialDiffusion = getDiffusion(&cells.cells[index]);
  var dudt: f32 = -6.0 * initialDiffusion;
  
  for(var i: u32 = 0; i < 6; i++){
    let neighbourPosition: vec2i = cellNeighbours[i];
    let neighbourIndex: u32 = getCellIndex(neighbourPosition);
    
    dudt += getDiffusion(&cells.cells[neighbourIndex]);
  }

  dudt *= settings.alpha / 12.0;

  let diffusion: f32 = initialDiffusion + dudt;
  let newValue: f32 = value + diffusion;
  let maxValue: f32 = max(
    bitcast<f32>(atomicLoad(&renderSettings.maxValue)),
    newValue
  );
  atomicStore(&renderSettings.maxValue, bitcast<u32>(maxValue));

  finished = max(
    finished,
    select(0u, 1u, axialRadius(axial) == cells.radius && newValue >= 1.0),
  );

  setValue(&cells.cells[index], newValue, cells.useValue);
  setDiffusion(&cells.cells[index], diffusion, cells.useValue);
}
