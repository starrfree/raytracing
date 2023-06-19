import { mat4, vec3 } from "gl-matrix";
import { Material, Mesh, Triangle } from "src/types/graphics";

export function createCube(center: [number, number, number], rotation: [number, number, number], size: number, material: Material) {
    let triangles: Triangle[] = []
    let v0 = [-1, -1, -1]
    let v1 = [1, -1, -1]
    let v2 = [1, 1, -1]
    let v3 = [-1, 1, -1]
    let v4 = [-1, -1, 1]
    let v5 = [1, -1, 1]
    let v6 = [1, 1, 1]
    let v7 = [-1, 1, 1]
    triangles.push(new Triangle(v1, v0, v2))
    triangles.push(new Triangle(v2, v0, v3))
    triangles.push(new Triangle(v5, v1, v6))
    triangles.push(new Triangle(v6, v1, v2))
    triangles.push(new Triangle(v4, v5, v7))
    triangles.push(new Triangle(v7, v5, v6))
    triangles.push(new Triangle(v0, v4, v3))
    triangles.push(new Triangle(v3, v4, v7))
    triangles.push(new Triangle(v2, v3, v6))
    triangles.push(new Triangle(v6, v3, v7))
    triangles.push(new Triangle(v5, v4, v1))
    triangles.push(new Triangle(v1, v4, v0))
    
    let rotationMatrix = mat4.create()
    mat4.translate(rotationMatrix, rotationMatrix, center)
    mat4.scale(rotationMatrix, rotationMatrix, [size / 2, size / 2, size / 2])
    mat4.rotateX(rotationMatrix, rotationMatrix, rotation[0])
    mat4.rotateY(rotationMatrix, rotationMatrix, rotation[1])
    mat4.rotateZ(rotationMatrix, rotationMatrix, rotation[2])
    triangles = triangles.map(triangle => {
        let newTriangle = new Triangle([0, 0, 0], [0, 0, 0], [0, 0, 0])
        vec3.transformMat4(newTriangle.v0, triangle.v0, rotationMatrix)
        vec3.transformMat4(newTriangle.v1, triangle.v1, rotationMatrix)
        vec3.transformMat4(newTriangle.v2, triangle.v2, rotationMatrix)
        return newTriangle
    })
    let bounding_box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
    for (let triangle of triangles) {
        for (let vertex of [triangle.v0, triangle.v1, triangle.v2]) {
            bounding_box[0] = Math.min(bounding_box[0], vertex[0])
            bounding_box[1] = Math.min(bounding_box[1], vertex[1])
            bounding_box[2] = Math.min(bounding_box[2], vertex[2])
            bounding_box[3] = Math.max(bounding_box[3], vertex[0])
            bounding_box[4] = Math.max(bounding_box[4], vertex[1])
            bounding_box[5] = Math.max(bounding_box[5], vertex[2])
        }
    }
    let mesh = new Mesh(0, triangles.length, bounding_box, material)
    return {
        triangles: triangles,
        mesh: mesh
    }
}