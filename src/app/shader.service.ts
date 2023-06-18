import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Sphere, Triangle } from 'src/types/graphics';

@Injectable({
  providedIn: 'root'
})
export class ShaderService {
  workgroupSize: number = 4
  renderCode: string = ""
  computeCode: string = ""

  constructor(private http: HttpClient) {}

  async getCode() {
    this.renderCode = await firstValueFrom(this.http.get('shaders/render.wgsl', {responseType: 'text'}))
    this.computeCode = (await firstValueFrom(this.http.get('shaders/compute.wgsl', {responseType: 'text'}))).replace(/WORKGROUP_SIZE/g, this.workgroupSize.toString())
  }

  async initWebGPUContext(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
      alert("WebGPU not supported on this browser. Try downloading the latest version of Google Chrome.")
      return
    }
    let adapter = (await navigator.gpu.requestAdapter())!
    if (!adapter) {
      alert("No appropriate GPU adapter found.")
      return
    }
    let device = await adapter.requestDevice()
    let context = canvas.getContext('webgpu')!
    let canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
      device: device,
      format: canvasFormat,
    })
    return { device: device, context: context, canvasFormat: canvasFormat }
  }

  createShaderModule(device: GPUDevice) {
    let computeShaderModule = device.createShaderModule({
      label: "simulation shader",
      code: this.computeCode
    })
    let renderShaderModule = device.createShaderModule({
      label: "render shader",
      code: this.renderCode
    })
    return { 
      computeShaderModule: computeShaderModule,
      renderShaderModule: renderShaderModule 
    }
  }

  createUniformBuffers(device: GPUDevice, uniforms: { name: string, array: Float32Array }[]) {
    let buffers: GPUBuffer[] = []
    uniforms.forEach((uniform, i) => {
      let buffer = device.createBuffer({
        label: `uniform ${uniform.name}`,
        size: uniform.array.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })
      device.queue.writeBuffer(buffer, 0, uniform.array)
      buffers.push(buffer)
    })
    return buffers
  }

  createStorageBuffers(device: GPUDevice, storage: { name: string, array: Float32Array }[]) {
    let buffers: GPUBuffer[] = []
    storage.forEach((storage, i) => {
      let buffer = device.createBuffer({
        label: `storage ${storage.name}`,
        size: storage.array.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })
      device.queue.writeBuffer(buffer, 0, storage.array)
      buffers.push(buffer)
    })
    return buffers
  }

  flatten(shapes: (Sphere | Triangle)[]) {
    let flat: number[] = []
    for (let shape of shapes) {
      flat.push(...shape.flat)
    }
    return new Float32Array(flat)
  }
}
