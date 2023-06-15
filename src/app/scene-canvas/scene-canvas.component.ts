import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ShaderService } from '../shader.service';

@Component({
  selector: 'app-scene-canvas',
  templateUrl: './scene-canvas.component.html',
  styleUrls: ['./scene-canvas.component.css']
})
export class SceneCanvasComponent implements OnInit {
  @ViewChild('canvas') public canvasElement!: ElementRef
  get canvas(): HTMLCanvasElement {
    return this.canvasElement.nativeElement
  }
  raysPerPixel: number = 1
  computesPerFrame: number = 1

  constructor(private shaderService: ShaderService) { }

  ngOnInit(): void {
  }

  async ngAfterViewInit() {
    this.resizeCanvas()
    await this.shaderService.getCode()
    let prop = await this.shaderService.initWebGPUContext(this.canvas)
    if (!prop) { return }
    let { device, context } = prop
    let { computeShaderModule, renderShaderModule } = this.shaderService.createShaderModule(device)
    let uniformBuffers = this.createUniformBuffers(device, [
      { name: "grid", array: new Float32Array([this.canvas.width * this.raysPerPixel, this.canvas.height * this.raysPerPixel]) },
    ])
    let rayBuffers = this.createRayBuffers(device)
    let bindings = this.getBindGroups(device, uniformBuffers, rayBuffers as [GPUBuffer, GPUBuffer])
    let computePipeline = this.createComputePipeline(device, computeShaderModule, bindings.layout)

    let params = { step: 0 }
    let frames = 0
    let startTime = performance.now()
    let render = () => {
      this.frame(device, computePipeline, bindings.groups, params)
      if (performance.now() - startTime >= 2000) {
        console.log("fps: " + frames / 2)
        startTime = performance.now()
      }
      frames++
      // requestAnimationFrame(render)
    }
    render()
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.clientWidth
    this.canvas.height = this.canvas.clientHeight
  }

  frame(device: GPUDevice, computePipeline: GPUComputePipeline, bindGroups: GPUBindGroup[], params: { step: number }) {
    let encoder = device.createCommandEncoder()

    for (let i = 0; i < this.computesPerFrame; i++) {
      this.compute(encoder, computePipeline, bindGroups[params.step % 2])
      params.step++
    }

    device.queue.submit([encoder.finish()])
  }

  compute(encoder: GPUCommandEncoder, pipeline: GPUComputePipeline, bindGroup: GPUBindGroup) {
    let computePass = encoder.beginComputePass()
    computePass.setPipeline(pipeline)
    computePass.setBindGroup(0, bindGroup)
    let width = Math.ceil(this.canvas.width * this.raysPerPixel / this.shaderService.workgroupSize)
    let height = Math.ceil(this.canvas.height * this.raysPerPixel / this.shaderService.workgroupSize)
    computePass.dispatchWorkgroups(width, height)
    computePass.end()
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

  createRayBuffers(device: GPUDevice) {
    let width = this.canvas.width
    let height = this.canvas.height
    let raysPerRow = width * this.raysPerPixel
    let raysPerCol = height * this.raysPerPixel
    let rays = new Float32Array(raysPerRow * raysPerCol * 4)
    let storage = [
      device.createBuffer({
        label: "rays 1",
        size: rays.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      device.createBuffer({
        label: "rays 2",
        size: rays.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })
    ]
    device.queue.writeBuffer(storage[0], 0, rays)
    device.queue.writeBuffer(storage[1], 0, rays)
    return storage
  }

  getBindGroups(device: GPUDevice, uniformBuffers: GPUBuffer[], rayBuffers: [GPUBuffer, GPUBuffer]) {
    let layoutEntries: GPUBindGroupLayoutEntry[] = []
    uniformBuffers.forEach((buffer, i) => {
      layoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
        buffer: {}
      })
    })
    layoutEntries.push({
      binding: uniformBuffers.length,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      buffer: {type: 'read-only-storage'}
    })
    layoutEntries.push({
      binding: uniformBuffers.length + 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    })
    let bindGroupLayout = device.createBindGroupLayout({
      label: "bind group layout",
      entries: layoutEntries
    })

    let bindGroupEntries1: GPUBindGroupEntry[] = []
    uniformBuffers.forEach((buffer, i) => {
      bindGroupEntries1.push({
        binding: i,
        resource: { buffer: buffer }
      })
    })
    bindGroupEntries1.push({
      binding: uniformBuffers.length,
      resource: { buffer: rayBuffers[0] }
    })
    bindGroupEntries1.push({
      binding: uniformBuffers.length + 1,
      resource: { buffer: rayBuffers[1] }
    })
    let bindGroupEntries2: GPUBindGroupEntry[] = []
    uniformBuffers.forEach((buffer, i) => {
      bindGroupEntries2.push({
        binding: i,
        resource: { buffer: buffer }
      })
    })
    bindGroupEntries2.push({
      binding: uniformBuffers.length,
      resource: { buffer: rayBuffers[1] }
    })
    bindGroupEntries2.push({
      binding: uniformBuffers.length + 1,
      resource: { buffer: rayBuffers[0] }
    })
    let bindGroups = [
      device.createBindGroup({
        label: "bind group 1",
        layout: bindGroupLayout,
        entries: bindGroupEntries1
      }),
      device.createBindGroup({
        label: "bind group 2",
        layout: bindGroupLayout,
        entries: bindGroupEntries2
      })
    ]
    return {
      layout: bindGroupLayout,
      groups: bindGroups
    }
  }

  createComputePipeline(device: GPUDevice, shaderModule: GPUShaderModule, bindGroupLayout: GPUBindGroupLayout) {
    let layout = device.createPipelineLayout({
      label: "compute pipeline layout",
      bindGroupLayouts: [bindGroupLayout]
    })
    let pipeline = device.createComputePipeline({
      label: "compute pipeline",
      layout: layout,
      compute: {
        module: shaderModule,
        entryPoint: "main"
      }
    })
    return pipeline
  }
}
