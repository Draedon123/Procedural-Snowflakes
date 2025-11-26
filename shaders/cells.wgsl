struct Cells {
  // axial coordinates
  radius: u32,
  useValue: u32,
  cells: array<Cell>,
}

struct Cell {
  // a kind of double buffering
  valueA: f32,
  valueB: f32,
  
  // as a bool
  receptive: u32,
}

fn getCellIndex(axial: vec2i) -> u32 {
  let uncentredHexCoordinates: vec2u = vec2u(axial + i32(cells.radius));
  let cellIndex: u32 = uncentredHexCoordinates.x + 2 * cells.radius * uncentredHexCoordinates.y;

  return cellIndex;
}

fn getValue(cell: ptr<storage, Cell, read_write>) -> f32 {
  return select(cell.valueA, cell.valueB, cells.useValue == 1);
}

fn setValue(cell: ptr<storage, Cell, read_write>, value: f32, useValue: u32) {
  if(useValue == 1){
    cell.valueA = value;
  } else {
    cell.valueB = value;
  }
}
