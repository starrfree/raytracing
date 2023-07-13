import { mat4, vec3 } from "gl-matrix";
import { Material, Mesh, Triangle } from "src/types/graphics";
import OBJ from "obj-file-parser-ts";

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
    
    let transformMatrix = mat4.create()
    mat4.translate(transformMatrix, transformMatrix, center)
    mat4.scale(transformMatrix, transformMatrix, [size / 2, size / 2, size / 2])
    mat4.rotateX(transformMatrix, transformMatrix, rotation[0])
    mat4.rotateY(transformMatrix, transformMatrix, rotation[1])
    mat4.rotateZ(transformMatrix, transformMatrix, rotation[2])
    triangles = triangles.map(triangle => {
        let newTriangle = new Triangle([0, 0, 0], [0, 0, 0], [0, 0, 0])
        vec3.transformMat4(newTriangle.v0, triangle.v0, transformMatrix)
        vec3.transformMat4(newTriangle.v1, triangle.v1, transformMatrix)
        vec3.transformMat4(newTriangle.v2, triangle.v2, transformMatrix)
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

export function createQuad(center: [number, number, number], rotation: [number, number, number], size: number | [number, number, number], material: Material) {
    let triangles: Triangle[] = []
    let v0 = [-1, -1, 0]
    let v1 = [1, -1, 0]
    let v2 = [1, 1, 0]
    let v3 = [-1, 1, 0]
    triangles.push(new Triangle(v1, v0, v2))
    triangles.push(new Triangle(v2, v0, v3))
    
    let transformMatrix = mat4.create()
    mat4.translate(transformMatrix, transformMatrix, center)
    if (typeof size === "number") {
        mat4.scale(transformMatrix, transformMatrix, [size / 2, size / 2, size / 2])
    } else {
        mat4.scale(transformMatrix, transformMatrix, [size[0] / 2, size[1] / 2, size[2] / 2])
    }
    mat4.rotateX(transformMatrix, transformMatrix, rotation[0])
    mat4.rotateY(transformMatrix, transformMatrix, rotation[1])
    mat4.rotateZ(transformMatrix, transformMatrix, rotation[2])
    triangles = triangles.map(triangle => {
        let newTriangle = new Triangle([0, 0, 0], [0, 0, 0], [0, 0, 0])
        vec3.transformMat4(newTriangle.v0, triangle.v0, transformMatrix)
        vec3.transformMat4(newTriangle.v1, triangle.v1, transformMatrix)
        vec3.transformMat4(newTriangle.v2, triangle.v2, transformMatrix)
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

export async function fileToMesh(data: string, center: [number, number, number], rotation: [number, number, number], size: number, material: Material) {
    // Parse the OBJ data
    let obj = new OBJ(data).parse().models[0]

    // Extract the vertex and face data
    let vertices = obj.vertices
    let faces = obj.faces

    // Convert the face data to triangles
    let triangles = [];
    for (let i = 0; i < faces.length; i++) {
        let face = faces[i];
        let v0 = vertices[face.vertices[0].vertexIndex - 1]
        let v1 = vertices[face.vertices[1].vertexIndex - 1]
        let v2 = vertices[face.vertices[2].vertexIndex - 1]
        triangles.push(new Triangle([v0.x, v0.y, v0.z], [v1.x, v1.y, v1.z], [v2.x, v2.y, v2.z]))
    }
    let transformMatrix = mat4.create()
    mat4.translate(transformMatrix, transformMatrix, center)
    mat4.scale(transformMatrix, transformMatrix, [size / 2, size / 2, size / 2])
    mat4.rotateX(transformMatrix, transformMatrix, rotation[0])
    mat4.rotateY(transformMatrix, transformMatrix, rotation[1])
    mat4.rotateZ(transformMatrix, transformMatrix, rotation[2])
    triangles = triangles.map(triangle => {
        let newTriangle = new Triangle([0, 0, 0], [0, 0, 0], [0, 0, 0])
        vec3.transformMat4(newTriangle.v0, triangle.v0, transformMatrix)
        vec3.transformMat4(newTriangle.v1, triangle.v1, transformMatrix)
        vec3.transformMat4(newTriangle.v2, triangle.v2, transformMatrix)
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