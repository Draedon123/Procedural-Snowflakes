struct RenderCellsSettings {
  maxValue: atomic<u32>,
}

@group(0) @binding(0) var <storage, read_write> finished: u32;
@group(0) @binding(1) var <storage, read_write> renderSettings: RenderCellsSettings;

@compute
@workgroup_size(1, 1, 1)
fn main() {
  if(finished == 0){
    atomicStore(&renderSettings.maxValue, 0);    
  }
}
