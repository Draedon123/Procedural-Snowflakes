#!import cells

struct Settings {
  alpha: f32,
  beta: f32,
  gamma: f32,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(1) var <storage, read_write>: cells: Cells;

@compute
@workgroup_size(8, 8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {

}
