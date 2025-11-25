struct Settings {
  placeholder: f32,
}

struct Cells {
  // axial coordinates
  radius: u32,
  cells: array<Cell>,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(0) var <storage> cells: Cells;

fn main() {

}
