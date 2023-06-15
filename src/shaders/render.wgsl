struct VertexInput {
  @location(0) pos: vec2f,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
};

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<uniform> canvas: vec2f;
@group(0) @binding(2) var<storage> colors: array<vec4f>;

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
    color += colors[index + i];
  }
  return color;
}