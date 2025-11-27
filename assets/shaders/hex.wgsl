fn axialRound(coordinates: vec2f) -> vec2i {
  return cubeiToAxiali(cubeRound(axialfToCubef(coordinates)));
}

fn axialiToCubei(axiali: vec2i) -> vec3i {
  return vec3i(
    axiali.xy,
    -axiali.x - axiali.y,
  );
}

fn axialfToCubef(axialf: vec2f) -> vec3f {
  return vec3f(
    axialf.xy,
    -axialf.x - axialf.y,
  );
}

fn cubeiToAxiali(cube: vec3i) -> vec2i {
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

fn isInBounds(axial: vec2i, maxRadius: u32) -> bool {
  return axialRadius(axial) <= maxRadius;
}

fn axialRadius(axial: vec2i) -> u32 {
  let cube: vec3i = axialiToCubei(axial);

  return u32(
    max(
      abs(cube.x),
      max(
        abs(cube.y),
        abs(cube.z)
      ),
    )
  );
}