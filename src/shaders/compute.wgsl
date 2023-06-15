@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<uniform> canvas: vec2f;
@group(0) @binding(2) var<storage> colorsIn: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> colorsOut: array<vec4f>;

@compute
@workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let index = gid.x + gid.y * u32(grid.x);
    let color = colorsIn[index].rgb + vec3f(0.0006, 0.0008, 0.001);
    colorsOut[index] = vec4f(color, 1.0);
}