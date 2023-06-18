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
