struct VertexInput {
  @location(0) pos: vec2f,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
};

@group(0) @binding(1) var<uniform> grid: vec2f;
@group(0) @binding(2) var<uniform> canvas: vec2f;
@group(0) @binding(7) var<storage> colors: array<vec4f>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.pos = vec4f(input.pos, 0, 1);
  return output;
}


struct FragInput {
  @builtin(position) pos: vec4f,
};

@fragment
fn fragmentMain(input: FragInput) -> @location(0) vec4f {
  let pp = u32(grid.x / canvas.x);
  let index = u32(input.pos.x) * pp + u32(input.pos.y) * u32(grid.x) * pp;
  var color = vec4f(0);
  for (var i = 0u; i < pp; i = i + 1u) {
    for (var j = 0u; j < pp; j = j + 1u) {
      color = color + colors[index + i * u32(grid.x) + j];
    }
  }
  color = color / f32(pp * pp);
  return color;
}