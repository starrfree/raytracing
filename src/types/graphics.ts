export class Sphere {
  center: Float32Array
  radius: Float32Array
  material: Material

  get flat(): Float32Array {
    let arrayBuffer = new ArrayBuffer(4 * 4 * 3)
    let float32Array = new Float32Array(arrayBuffer)
    let view1 = new Float32Array(arrayBuffer, 0, 4)
    let view2 = new Float32Array(arrayBuffer, 4 * 4, 4)
    let view3 = new Float32Array(arrayBuffer, 4 * 4 * 2, 4)
    view1.set([...this.center, ...this.radius])
    view2.set([...this.material.color, ...this.material.emission])
    view3.set([...this.material.roughness, ...this.material.specular_probability, 0, 0])
    return float32Array
  }

  constructor(center: number[], radius: number, material: Material) {
    this.center = new Float32Array(center)
    this.radius = new Float32Array([radius])
    this.material = material
  }
};

export class Mesh {
  triangle_start: Float32Array
  triangle_count: Float32Array
  bounding_box: Float32Array /// [min_x, min_y, min_z, max_x, max_y, max_z]
  material: Material

  get flat(): Float32Array {
    let arrayBuffer = new ArrayBuffer(4 * 4 * 5)
    let float32Array = new Float32Array(arrayBuffer)
    let view1 = new Float32Array(arrayBuffer, 0, 4)
    let view2 = new Float32Array(arrayBuffer, 4 * 4, 4)
    let view3 = new Float32Array(arrayBuffer, 4 * 4 * 2, 4)
    let view4 = new Float32Array(arrayBuffer, 4 * 4 * 3, 4)
    let view5 = new Float32Array(arrayBuffer, 4 * 4 * 4, 4)
    view1.set([...this.triangle_start, ...this.triangle_count, 0, 0])
    view2.set([...this.bounding_box.slice(0, 3), 0])
    view3.set([...this.bounding_box.slice(3, 6), 0])
    view4.set([...this.material.color, ...this.material.emission])
    view5.set([...this.material.roughness, ...this.material.specular_probability, 0, 0])
    return float32Array
  }

  constructor(triangle_start: number, triangle_count: number, bounding_box: number[], material: Material) {
    this.triangle_start = new Float32Array([triangle_start])
    this.triangle_count = new Float32Array([triangle_count])
    this.bounding_box = new Float32Array(bounding_box)
    this.material = material
  }
}

export class Triangle {
  v0: Float32Array
  v1: Float32Array
  v2: Float32Array

  get flat(): Float32Array {
    let arrayBuffer = new ArrayBuffer(4 * 4 * 3)
    let float32Array = new Float32Array(arrayBuffer)
    let view1 = new Float32Array(arrayBuffer, 0, 4)
    let view2 = new Float32Array(arrayBuffer, 4 * 4, 4)
    let view3 = new Float32Array(arrayBuffer, 4 * 4 * 2, 4)
    view1.set([...this.v0, 0])
    view2.set([...this.v1, 0])
    view3.set([...this.v2, 0])
    return float32Array
  }

  constructor(v0: number[], v1: number[], v2: number[]) {
    this.v0 = new Float32Array(v0)
    this.v1 = new Float32Array(v1)
    this.v2 = new Float32Array(v2)
  }
}

export class Material {
  color: Float32Array
  emission: Float32Array
  roughness: Float32Array
  specular_probability: Float32Array

  get flat(): Float32Array {
    return new Float32Array([
      ...this.color,
      ...this.emission,
      ...this.roughness,
      ...this.specular_probability,
    ])
  }

  constructor(color: number[], emission: number, roughness: number, specular_probability: number) {
    this.color = new Float32Array(color)
    this.emission = new Float32Array([emission])
    this.roughness = new Float32Array([roughness])
    this.specular_probability = new Float32Array([specular_probability])
  }
};
