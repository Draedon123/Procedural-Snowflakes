struct Cells {
  radius: u32,
  useValue: u32,
  cells: array<Cell>,
}

struct Cell {
  // a kind of double buffering
  value: array<f32, 2>,
  diffusion: array<f32, 2>,
  
  // as a bool
  receptive: u32,
}

fn getCellIndex(axial: vec2i) -> u32 {
  let uncentredHexCoordinates: vec2u = vec2u(axial + i32(cells.radius));
  let cellIndex: u32 = uncentredHexCoordinates.x + 2 * cells.radius * uncentredHexCoordinates.y;

  return cellIndex;
}

fn getValue(cell: ptr<storage, Cell, read_write>) -> f32 {
  return cell.value[cells.useValue];
}

fn setValue(cell: ptr<storage, Cell, read_write>, value: f32, useValue: u32) {
  cell.value[1 - useValue] = value;
}

fn getDiffusion(cell: ptr<storage, Cell, read_write>) -> f32 {
  return cell.diffusion[cells.useValue];
}

fn setDiffusion(cell: ptr<storage, Cell, read_write>, diffusion: f32, useValue: u32) {
  cell.diffusion[1 - useValue] = diffusion;
}
