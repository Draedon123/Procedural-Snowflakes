struct RenderCellsSettings {
  // stores bits of f32 maxValue
  maxValue: atomic<u32>,
}

// as a bool
@group(0) @binding(0) var <storage, read_write> finished: u32;
@group(0) @binding(1) var <storage, read_write> renderSettings: RenderCellsSettings;

const ZERO: u32 = bitcast<u32>(0.0);

@compute
@workgroup_size(1, 1, 1)
fn main() {
  if(finished == 0){
    atomicStore(&renderSettings.maxValue, ZERO);    
  }
}
