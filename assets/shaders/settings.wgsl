struct SnowflakeSettings {
  alpha: f32,
  beta: f32,
  gamma: f32,
}

struct RenderCellsSettings {
  // stores bits of f32 maxValue
  maxValue: atomic<u32>,
}