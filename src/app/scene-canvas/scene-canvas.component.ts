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
  targetFrames: number = 1

  constructor(private shaderService: ShaderService) { }

  ngOnInit(): void {
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.clientWidth / 2
    this.canvas.height = this.canvas.clientHeight / 2
  }
  async ngAfterViewInit() {
    this.resizeCanvas()
    await this.shaderService.getCode()
    let prop = await this.shaderService.initWebGPUContext(this.canvas)
    if (!prop) { return }
    let { device, context, canvasFormat } = prop
    let { computeShaderModule, renderShaderModule } = this.shaderService.createShaderModule(device)
    let uniforms = [
      { name: "time", array: new Float32Array([0]) },
      { name: "grid", array: new Float32Array([this.canvas.width * this.raysPerPixel, this.canvas.height * this.raysPerPixel]) },
      { name: "canvas", array: new Float32Array([this.canvas.width, this.canvas.height]) },
      { name: "target_frames", array: new Float32Array([this.targetFrames]) },
    ]
    let uniformBuffers = this.createUniformBuffers(device, uniforms)
    let rayBuffers = this.createRayBuffers(device)
    let bindings = this.getBindGroups(device, uniformBuffers, rayBuffers as [GPUBuffer, GPUBuffer])
    let computePipeline = this.createComputePipeline(device, computeShaderModule, bindings.layout)
    let vertexBuffer = this.createVertexBuffer(device)
    let renderPipeline = this.createRenderPipeline(device, canvasFormat, renderShaderModule, bindings.layout)

    let params = { step: 0 }
    let frames = 0
    let startTime = performance.now()
    let render = () => {
      this.frame(device, context, computePipeline, renderPipeline, vertexBuffer, bindings.groups, uniformBuffers, params)
      if (performance.now() - startTime >= 1000) {
        console.log("fps: " + frames)
        startTime = performance.now()
        frames = 0
      }
      frames++
      if (params.step < this.targetFrames) {
        requestAnimationFrame(render)
      }
    }
    render()
  }

  frame(device: GPUDevice, context: GPUCanvasContext, computePipeline: GPUComputePipeline, renderPipeline: GPURenderPipeline, vertexBuffer: GPUBuffer, bindGroups: GPUBindGroup[], uniformBuffers: GPUBuffer[], params: { step: number }) {
    let encoder = device.createCommandEncoder()
    device.queue.writeBuffer(uniformBuffers[0], 0, new Float32Array([params.step / this.targetFrames]))
    this.compute(encoder, computePipeline, bindGroups[params.step % 2])
    params.step++
    this.render(encoder, renderPipeline, bindGroups[params.step % 2], context, vertexBuffer)
    device.queue.submit([encoder.finish()])
  }

  compute(encoder: GPUCommandEncoder, pipeline: GPUComputePipeline, bindGroup: GPUBindGroup) {
    let computePass = encoder.beginComputePass()
    computePass.setBindGroup(0, bindGroup)
    computePass.setPipeline(pipeline)
    let width = Math.ceil(this.canvas.width * this.raysPerPixel / this.shaderService.workgroupSize)
    let height = Math.ceil(this.canvas.height * this.raysPerPixel / this.shaderService.workgroupSize)
    computePass.dispatchWorkgroups(width, height)
    computePass.end()
  }

  render(encoder: GPUCommandEncoder, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup, context: GPUCanvasContext, vertexBuffer: GPUBuffer) {
    let renderPass = encoder.beginRenderPass({
      colorAttachments: [{
         view: context.getCurrentTexture().createView(),
         loadOp: 'clear',
         storeOp: 'store',
         clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }
      }]
    })
    renderPass.setVertexBuffer(0, vertexBuffer)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.setPipeline(pipeline)
    renderPass.draw(6)
    renderPass.end()
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

  createVertexBuffer(device: GPUDevice) {
    let vertices = new Float32Array([
      -1, -1,
       1, -1,
       1,  1,
    
      -1, -1,
       1,  1,
      -1,  1,
    ])
    let buffer = device.createBuffer({
      label: "vertex buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    })
    device.queue.writeBuffer(buffer, 0, vertices)
    return buffer
  }

  getBindGroups(device: GPUDevice, uniformBuffers: GPUBuffer[], rayBuffers: [GPUBuffer, GPUBuffer]) {
    let layoutEntries: GPUBindGroupLayoutEntry[] = []
    uniformBuffers.forEach((buffer, i) => {
      layoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: {}
      })
    })
    layoutEntries.push({
      binding: uniformBuffers.length,
      visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
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

  createRenderPipeline(device: GPUDevice, canvasFormat: GPUTextureFormat, shaderModule: GPUShaderModule, bindGroupLayout: GPUBindGroupLayout) {
    let layout = device.createPipelineLayout({
      label: "render pipeline layout",
      bindGroupLayouts: [bindGroupLayout]
    })
    let vertexLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [{
        format: 'float32x2',
        offset: 0,
        shaderLocation: 0,
      }],
    }
    let pipeline = device.createRenderPipeline({
      label: "render pipeline",
      layout: layout,
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexLayout]
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [{
          format: canvasFormat,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
    })
    return pipeline
  }
}
