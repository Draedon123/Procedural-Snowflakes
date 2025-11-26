fn axialRound(coordinates: vec2f) -> vec2i {
  return cubeToAxial(cubeRound(axialfToCubef(coordinates)));
}

fn axialfToCubef(axialf: vec2f) -> vec3f {
  return vec3f(
    axialf.xy,
    -axialf.x - axialf.y,
  );
}

fn cubeToAxial(cube: vec3i) -> vec2i {
  return cube.xy;
}

fn cubeRound(cube: vec3f) -> vec3i {
  let rounded: vec3f = round(cube);
  let difference: vec3f = abs(rounded - cube);

  if(difference.x > difference.y && difference.x > difference.z){
    return vec3i(i32(-rounded.y - rounded.z), vec2i(rounded.yz));
  }

  if(difference.y > difference.z){
    return vec3i(vec3f(rounded.x, -rounded.x - rounded.z, rounded.z));
  }

  return vec3i(vec2i(rounded.xy), i32(-rounded.x - rounded.y));
}

const INVERSE_MATRIX: mat2x2f = mat2x2f(
  vec2f(sqrt(3) / 3.0, 0.0      ),
  vec2f(-1.0 / 3.0   , 2.0 / 3.0)
);

fn pixelToHex(pixel: vec2i, hexRadius: f32) -> vec2i {
  let scaled: vec2f = vec2f(pixel) / hexRadius;
  let axial: vec2f = INVERSE_MATRIX * scaled;

  return axialRound(axial);
}

fn neighbours(axial: vec2i) -> array<vec2i, 6> {
  return array(
    axial + vec2i( 1,  0),
    axial + vec2i( 1, -1),
    axial + vec2i( 0, -1),
    axial + vec2i(-1,  0),
    axial + vec2i(-1,  1),
    axial + vec2i( 0,  1),
  );
}

fn isInBounds(axial: vec2i, maxRadius: i32) -> bool {
  return abs(axial.x) <= maxRadius && abs(axial.y) <= maxRadius && abs(-axial.x - axial.y) <= maxRadius;
}
