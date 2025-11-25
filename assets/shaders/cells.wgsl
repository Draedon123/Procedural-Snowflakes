struct Cells {
  // axial coordinates
  radius: u32,
  cells: array<Cell>,
}

struct Cell {
  value: f32,
  // as a bool
  receptive: u32,
}

fn getCellIndex(axial: vec2i) -> u32 {
  let uncentredHexCoordinates: vec2u = vec2u(axial + i32(cells.radius));
  let cellIndex: u32 = uncentredHexCoordinates.x + 2 * cells.radius * uncentredHexCoordinates.y;

  return cellIndex;
}
