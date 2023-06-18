@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> grid: vec2f;
@group(0) @binding(2) var<uniform> canvas: vec2f;
@group(0) @binding(3) var<uniform> target_frames: f32;
@group(0) @binding(4) var<uniform> sphere_count: f32;
@group(0) @binding(5) var<storage> spheres: array<Sphere>;
@group(0) @binding(6) var<storage> colorsIn: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> colorsOut: array<vec4f>;

struct Ray {
  origin: vec3f,
  direction: vec3f,
  color: vec3f,
  light: vec3f,
}

struct HitInfo {
  hit: bool,
  distance: f32,
  position: vec3f,
  normal: vec3f,
  material: Material,
}

struct Sphere {
  center: vec3f,
  radius: f32,
  material: Material,
}

struct Material {
  color: vec3f,
  emission: f32,
  roughness: f32,
  specular_probability: f32,
}

struct Random {
  value: f32,
  seed: u32,
}

const max_bounces = 1000;
const ray_count = 10;

const PI = 3.1415926535897932384626433832795;

@compute
@workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (f32(gid.x) >= grid.x || f32(gid.y) >= grid.y) {
    return;
  }
  let index = gid.x + gid.y * u32(grid.x);
  let ar = canvas.x / canvas.y;
  var x = f32(gid.x) / grid.x;
  var y = 1 - f32(gid.y) / grid.y;
  x = x * 5 - 2.5;
  y = y * 5 - 2.5;
  x *= ar;

  var color = vec3f(0);
  for (var i = 0; i <= ray_count; i++) {
    var ray: Ray;
    ray.origin = vec3f(0);
    ray.direction = normalize(vec3f(x, y, 4));
    ray.color = vec3f(1);
    ray.light = vec3f(0);

    for (var bounce = 0; bounce <= max_bounces; bounce++) {
      var hit = spheres_intersect(ray);
      if (hit.hit) {
        ray.origin = hit.position;
        let seed = ((index + u32(time * grid.x * grid.y)) * u32(ray_count) + u32(i)) * u32(max_bounces) + u32(bounce);

        ray.direction = random_on_hemisphere(seed, hit.normal) * hit.material.roughness + (1 - hit.material.roughness) * reflect(ray.direction, hit.normal);
        ray.light += hit.material.emission * ray.color;
        ray.color *= hit.material.color;
        if (hit.material.emission >= 1) {
          break;
        }
      } else {
        ray.light += 0.02 * ray.color;
        break;
      }
    }
    color += ray.light;
  }
  
  color = colorsIn[index].rgb + color / f32(ray_count) / target_frames * 3;
  colorsOut[index] = vec4f(color, 1.0);
}

fn spheres_intersect(ray: Ray) -> HitInfo {
  var closest_hit: HitInfo;
  var found = false;
  for (var i = 0; i < i32(sphere_count); i++) {
    let hit = sphere_intersect(ray, spheres[i]);
    if (hit.hit) {
      if (!found || hit.distance < closest_hit.distance) {
        closest_hit = hit;
        found = true;
      }
    }
  }
  return closest_hit;
}

fn sphere_intersect(ray: Ray, sphere: Sphere) -> HitInfo {
  let oc = ray.origin - sphere.center;
  let a = dot(ray.direction, ray.direction);
  let b = 2 * dot(oc, ray.direction);
  let c = dot(oc, oc) - sphere.radius * sphere.radius;
  let discriminant = b * b - 4 * a * c;
  var hit: HitInfo;
  hit.hit = false;
  if (discriminant >= 0) {
    let dst = (-b - sqrt(discriminant)) / (2 * a);
    if (dst >= 0) {
      hit.hit = true;
      hit.distance = dst;
      hit.position = ray.origin + ray.direction * dst;
      hit.normal = normalize(hit.position - sphere.center);
      hit.material = sphere.material;
    }
  }
  return hit;
}

fn random(seed: u32) -> f32 {
  var state = seed * 747796405 + 2891336453;
  state = ((state >> ((state >> 28) + 4)) ^ state) * 277803737;
  state = (state >> 22) ^ state;
  let value = f32(state) / 4294967295.0;
  return value; 
}

fn random_on_sphere(seed: u32) -> vec3f {
  var theta = random(2 * seed) * 2 * PI;
  var phi = acos(2 * random(2 * seed + 1) - 1);
  var x = sin(phi) * cos(theta);
  var y = sin(phi) * sin(theta);
  var z = cos(phi);
  return vec3f(x, y, z);
}

fn random_on_hemisphere(seed: u32, normal: vec3f) -> vec3f {
  var r = random_on_sphere(seed);
  if (dot(r, normal) < 0) {
    r = -r;
  }
  return r;
}