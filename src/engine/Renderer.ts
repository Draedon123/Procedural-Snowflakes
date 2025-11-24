import { BufferWriter } from "../utils/BufferWriter";
import { GPUTimer } from "../utils/GPUTimer";
import { resolveBasePath } from "../utils/resolveBasePath";
import { roundUp16Bytes } from "../utils/roundUp16Bytes";
import { Shader } from "./Shader";

type RendererSettings = {
  timing?: Partial<{
    frameTimeElement: HTMLElement;
    fpsElement: HTMLElement;
  }>;
};

class Renderer {
  private static readonly RENDER_SETTINGS_BYTE_LENGTH: number = roundUp16Bytes(
    1 * Float32Array.BYTES_PER_ELEMENT
  );
  private static readonly COMPUTE_SETTINGS_BYTE_LENGTH: number = roundUp16Bytes(
    1 * Float32Array.BYTES_PER_ELEMENT
  );

  public readonly canvas: HTMLCanvasElement;
  public readonly settings: Omit<RendererSettings, "blackHole">;

  private readonly device: GPUDevice;
  private readonly ctx: GPUCanvasContext;
  private readonly canvasFormat: GPUTextureFormat;
  private readonly gpuTimer: GPUTimer;

  private initialised: boolean;

  private renderSettingsBuffer!: GPUBuffer;
  private renderBindGroupLayout!: GPUBindGroupLayout;
  private renderBindGroup!: GPUBindGroup;
  private renderPipeline!: GPURenderPipeline;
  private renderTexture!: GPUTexture;
  private sampler!: GPUSampler;

  private computeSettingsBuffer!: GPUBuffer;
  private computeBindGroupLayout!: GPUBindGroupLayout;
  private computeBindGroup!: GPUBindGroup;
  private computePipeline!: GPUComputePipeline;

  private constructor(
    canvas: HTMLCanvasElement,
    settings: Partial<RendererSettings>,
    device: GPUDevice
  ) {
    const ctx = canvas.getContext("webgpu");

    if (ctx === null) {
      throw new Error("Could not create WebGPU Canvas Context");
    }

    this.canvas = canvas;
    this.device = device;
    this.ctx = ctx;
    this.canvasFormat = "rgba8unorm";
    this.gpuTimer = new GPUTimer(this.device, (time) => {
      const microseconds = time / 1e3;
      const milliseconds = time / 1e6;
      const seconds = time / 1e9;
      const useMilliseconds = milliseconds > 1;
      const displayTime = (
        useMilliseconds ? milliseconds : microseconds
      ).toFixed(2);
      const prefix = useMilliseconds ? "ms" : "μs";

      if (this.settings.timing?.frameTimeElement !== undefined) {
        this.settings.timing.frameTimeElement.textContent =
          displayTime + prefix;
      }

      if (this.settings.timing?.fpsElement !== undefined) {
        const fps = 1 / seconds;
        this.settings.timing.fpsElement.textContent = fps.toFixed(2);
      }
    });

    this.initialised = false;
    this.settings = {
      timing: settings.timing,
    };
  }

  private serialiseRenderSettings(): ArrayBuffer {
    const bufferWriter = new BufferWriter(Renderer.RENDER_SETTINGS_BYTE_LENGTH);

    return bufferWriter.buffer;
  }

  private serialiseComputeSettings(): ArrayBuffer {
    const bufferWriter = new BufferWriter(
      Renderer.COMPUTE_SETTINGS_BYTE_LENGTH
    );

    return bufferWriter.buffer;
  }

  private createRenderTexture(): GPUTexture {
    return this.device.createTexture({
      label: "Render Texture",
      format: "rgba8unorm",
      size: [this.canvas.width, this.canvas.height],
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private createRenderBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      label: "Renderer Bind Group",
      layout: this.renderBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.renderSettingsBuffer },
        },
        {
          binding: 1,
          resource: this.renderTexture.createView(),
        },
        {
          binding: 2,
          resource: this.sampler,
        },
      ],
    });
  }

  private createComputeBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      label: "Compute Bind Group",
      layout: this.computeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.computeSettingsBuffer },
        },
        {
          binding: 1,
          resource: this.renderTexture.createView(),
        },
      ],
    });
  }

  public async initialise(): Promise<void> {
    if (this.initialised) {
      return;
    }

    await this.initialiseRendering();
    await this.initialiseCompute();

    this.updateSettings();

    new ResizeObserver((entries) => {
      const canvas = entries[0];

      const width = canvas.devicePixelContentBoxSize[0].inlineSize;
      const height = canvas.devicePixelContentBoxSize[0].blockSize;

      this.canvas.width = width;
      this.canvas.height = height;

      this.renderTexture.destroy();
      this.gpuTimer.reset();

      this.renderTexture = this.createRenderTexture();
      this.renderBindGroup = this.createRenderBindGroup();
      this.computeBindGroup = this.createComputeBindGroup();

      this.render();
    }).observe(this.canvas);

    this.initialised = true;
  }

  private async initialiseRendering(): Promise<void> {
    this.ctx.configure({
      device: this.device,
      format: this.canvasFormat,
    });

    this.renderSettingsBuffer = this.device.createBuffer({
      label: "Render Settings Buffer",
      size: Renderer.RENDER_SETTINGS_BYTE_LENGTH,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.renderTexture = this.createRenderTexture();
    this.sampler = this.device.createSampler({
      label: "Renderer Texture Sampler",
      minFilter: "linear",
      magFilter: "linear",
    });

    const shader = await Shader.fetch(
      this.device,
      resolveBasePath("shaders/render.wgsl")
    );

    this.renderBindGroupLayout = this.device.createBindGroupLayout({
      label: "Renderer Bind Group Layout",
      entries: [
        {
          binding: 0,
          buffer: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 1,
          texture: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 2,
          sampler: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
      ],
    });

    this.renderBindGroup = this.createRenderBindGroup();

    const pipelineLayout = this.device.createPipelineLayout({
      label: "Renderer Render Pipeline Layout",
      bindGroupLayouts: [this.renderBindGroupLayout],
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: "Renderer Render Pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shader.shader,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: shader.shader,
        entryPoint: "fragmentMain",
        targets: [{ format: this.canvasFormat }],
      },
    });
  }

  private async initialiseCompute(): Promise<void> {
    this.computeSettingsBuffer = this.device.createBuffer({
      label: "Compute Settings Buffer",
      size: Renderer.COMPUTE_SETTINGS_BYTE_LENGTH,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    const shader = await Shader.fetch(
      this.device,
      resolveBasePath("shaders/compute.wgsl")
    );

    this.computeBindGroupLayout = this.device.createBindGroupLayout({
      label: "Compute Bind Group Layout",
      entries: [
        {
          binding: 0,
          buffer: {},
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 1,
          storageTexture: {
            access: "write-only",
            format: "rgba8unorm",
          },
          visibility: GPUShaderStage.COMPUTE,
        },
      ],
    });

    this.computeBindGroup = this.createComputeBindGroup();

    const pipelineLayout = this.device.createPipelineLayout({
      label: "Compute Pipeline Layout",
      bindGroupLayouts: [this.computeBindGroupLayout],
    });

    this.computePipeline = this.device.createComputePipeline({
      label: "Compute Pipeline",
      layout: pipelineLayout,
      compute: {
        module: shader.shader,
        entryPoint: "main",
      },
    });
  }

  public updateSettings(): void {
    this.device.queue.writeBuffer(
      this.renderSettingsBuffer,
      0,
      this.serialiseRenderSettings()
    );

    this.device.queue.writeBuffer(
      this.computeSettingsBuffer,
      0,
      this.serialiseComputeSettings()
    );
  }

  public render(): void {
    this.compute();
    this.renderToCanvas();
  }

  private compute(): void {
    const commandEncoder = this.device.createCommandEncoder();
    const computePass = this.gpuTimer.beginComputePass(commandEncoder);

    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.setPipeline(this.computePipeline);
    computePass.dispatchWorkgroups(
      Math.ceil(this.canvas.width / 8),
      Math.ceil(this.canvas.height / 8),
      1
    );

    computePass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private renderToCanvas(): void {
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.setPipeline(this.renderPipeline);
    renderPass.draw(3);

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  public static async create(
    canvas: HTMLCanvasElement,
    settings: Partial<RendererSettings> = {}
  ): Promise<Renderer> {
    if (!("gpu" in navigator)) {
      throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();

    if (adapter === null) {
      throw new Error("Could not find suitable GPU Adapter");
    }

    const device = await adapter.requestDevice({
      requiredFeatures: ["timestamp-query"],
    });

    if (device === null) {
      throw new Error("Could not find suitable GPU Device");
    }

    return new Renderer(canvas, settings, device);
  }
}

export { Renderer };
