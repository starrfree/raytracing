import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShaderService {
  workgroupSize: number = 8
  renderCode: string = ""
  computeCode: string = ""

  constructor(private http: HttpClient) {}

  async getCode() {
    this.renderCode = await firstValueFrom(this.http.get('shaders/render.wgsl', {responseType: 'text'}))
    this.computeCode = (await firstValueFrom(this.http.get('shaders/compute.wgsl', {responseType: 'text'}))).replace(/WORKGROUP_SIZE/g, this.workgroupSize.toString())
  }

  async initWebGPUContext(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
      alert("WebGPU not supported on this browser.")
      return
    }
    let adapter = (await navigator.gpu.requestAdapter())!
    if (!adapter) {
      alert("No appropriate GPUAdapter found.")
      return
    }
    let device = await adapter.requestDevice()
    let context = canvas.getContext('webgpu')!
    let canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
      device: device,
      format: canvasFormat,
    })
    return { device: device, context: context }
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
}
