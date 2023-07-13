@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> grid: vec2f;
@group(0) @binding(2) var<uniform> canvas: vec2f;
@group(0) @binding(3) var<uniform> target_frames: f32;
@group(0) @binding(4) var<uniform> sphere_count: f32;
@group(0) @binding(5) var<uniform> mesh_count: f32;
@group(0) @binding(6) var<uniform> scene_transform: mat4x4f;
@group(0) @binding(7) var<storage> spheres: array<Sphere>;
@group(0) @binding(8) var<storage> triangles: array<Triangle>;
@group(0) @binding(9) var<storage> meshes: array<Mesh>;
@group(0) @binding(10) var<storage> colorsIn: array<vec4f>;
@group(0) @binding(11) var<storage, read_write> colorsOut: array<vec4f>;

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

struct Triangle {
  v0: vec3f,
  v1: vec3f,
  v2: vec3f,
}

struct Mesh {
  triangle_start: f32,
  triangle_count: f32,
  bounding_box: array<vec3f, 2>,
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

const max_bounces = 30;
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
    let ray_seed = (index + u32(time * grid.x * grid.y)) * u32(ray_count) + u32(i);
    var ray: Ray;
    ray.origin = vec3f(0);
    ray.direction = normalize(vec3f(x, y, 4) + random_on_disk(ray_seed, 0.01));
    ray.color = vec3f(1);
    ray.light = vec3f(0);

    for (var bounce = 0; bounce <= max_bounces; bounce++) {
      var hit = intersect(ray);
      if (hit.hit) {
        ray.origin = hit.position;
        let seed = ray_seed * u32(max_bounces) + u32(bounce);

        let is_specular = random(seed) > hit.material.specular_probability;
        if (is_specular) {
          ray.direction = random_on_hemisphere(seed, hit.normal);
        } else {
          ray.direction = random_on_hemisphere(seed, hit.normal) * hit.material.roughness + (1 - hit.material.roughness) * reflect(ray.direction, hit.normal);
        }
        ray.light += hit.material.emission * ray.color;
        if (is_specular) {
          ray.color *= hit.material.color;
        } else {
          ray.color *= 0.9;
        }
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

fn intersect(ray: Ray) -> HitInfo {
  var closest_hit: HitInfo;
  var found = false;
  for (var i = 0; i < i32(sphere_count); i++) {
    var sphere = spheres[i];
    sphere.center = (scene_transform * vec4f(sphere.center, 1)).xyz;
    let hit = sphere_intersect(ray, sphere);
    if (hit.hit) {
      if (!found || hit.distance < closest_hit.distance) {
        closest_hit = hit;
        found = true;
      }
    }
  }
  for (var i = 0; i < i32(mesh_count); i++) {
    var mesh = meshes[i];
    mesh.bounding_box[0] = transform(mesh.bounding_box[0]);
    mesh.bounding_box[1] = transform(mesh.bounding_box[1]);
    let hit = mesh_intersect(ray, mesh);
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

fn mesh_intersect(ray: Ray, mesh: Mesh) -> HitInfo {
  var closest_hit: HitInfo;
  closest_hit.hit = false;
  if (ray_box_intersect(ray, mesh.bounding_box)) {
    for (var i = 0; i < i32(mesh.triangle_count); i++) {
      var triangle = triangles[i + i32(mesh.triangle_start)];
      triangle.v0 = transform(triangle.v0);
      triangle.v1 = transform(triangle.v1);
      triangle.v2 = transform(triangle.v2);
      var hit = triangle_intersect(ray, triangle);
      hit.material = mesh.material;
      if (hit.hit) {
        if (!closest_hit.hit || hit.distance < closest_hit.distance) {
          closest_hit = hit;
        }
      }
    }
  }
  return closest_hit;
}

fn triangle_intersect(ray: Ray, triangle: Triangle) -> HitInfo {
  let v0v1 = triangle.v1 - triangle.v0;
  let v0v2 = triangle.v2 - triangle.v0;
  let pvec = cross(ray.direction, v0v2);
  let det = dot(v0v1, pvec);
  var hit: HitInfo;
  hit.hit = false;
  if (det < 0.0000000001) {
    return hit;
  }
  let invDet = 1 / det;
  let tvec = ray.origin - triangle.v0;
  let u = dot(tvec, pvec) * invDet;
  if (u < 0 || u > 1) {
    return hit;
  }
  let qvec = cross(tvec, v0v1);
  let v = dot(ray.direction, qvec) * invDet;
  if (v < 0 || u + v > 1) {
    return hit;
  }
  let t = dot(v0v2, qvec) * invDet;
  if (t < 0) {
    return hit;
  }
  hit.hit = true;
  hit.distance = t;
  hit.position = ray.origin + ray.direction * t;
  hit.normal = normalize(cross(v0v1, v0v2));
  return hit;
}

fn ray_box_intersect(ray: Ray, box: array<vec3f, 2>) -> bool {
  let invdir = vec3f(1) / ray.direction;
  let t1 = (box[0].x - ray.origin.x) * invdir.x;
  let t2 = (box[1].x - ray.origin.x) * invdir.x;
  let t3 = (box[0].y - ray.origin.y) * invdir.y;
  let t4 = (box[1].y - ray.origin.y) * invdir.y;
  let t5 = (box[0].z - ray.origin.z) * invdir.z;
  let t6 = (box[1].z - ray.origin.z) * invdir.z;
  let tmin = max(max(min(t1, t2), min(t3, t4)), min(t5, t6));
  let tmax = min(min(max(t1, t2), max(t3, t4)), max(t5, t6));
  return tmax >= 0 && tmin <= tmax;
}

fn transform(vect: vec3f) -> vec3f {
  return (scene_transform * vec4f(vect, 1)).xyz;
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

fn random_on_disk(seed: u32, radius: f32) -> vec3f {
  var theta = random(2 * seed) * 2 * PI;
  var r = radius * sqrt(random(2 * seed + 1));
  var x = r * cos(theta);
  var y = r * sin(theta);
  return vec3f(x, y, 0);
}