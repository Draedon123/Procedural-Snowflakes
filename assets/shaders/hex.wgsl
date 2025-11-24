fn axialRound(coordinates: vec2f) -> vec2i {
  let rounded: vec2f = round(coordinates);
  let remainder: vec2f = coordinates - rounded;

  return select(
    vec2i(i32(rounded.x), i32(coordinates.y + round(coordinates.x + 0.5 * coordinates.y))),
    vec2i(i32(rounded.x + round(coordinates.x + 0.5 * coordinates.y)), i32(coordinates.y)),
    abs(remainder.x) > abs(remainder.y),
  );
}

const INVERSE_MATRIX: mat2x2f = mat2x2f(
  vec2f(sqrt(3) / 3.0, 0        ),
  vec2f(-1.0 / 3.0   , 2.0 / 3.0)
);

fn pixelToHex(pixel: vec2i, hexRadius: f32) -> vec2i {
  let scaled: vec2f = vec2f(pixel) / hexRadius;
  let axial: vec2f = INVERSE_MATRIX * scaled;

  return axialRound(axial);
}