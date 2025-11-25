import { BufferWriter } from "../utils/BufferWriter";
import { GPUTimer } from "../utils/GPUTimer";
import { resolveBasePath } from "../utils/resolveBasePath";
import { roundUp16Bytes } from "../utils/roundUp16Bytes";
import { RenderCells } from "./compute/RenderCells";
import { Stage1 } from "./compute/Stage1";
import { Shader } from "./Shader";
import { Snowflake } from "./Snowflake";

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

  public readonly canvas: HTMLCanvasElement;
  public readonly settings: RendererSettings;
  public readonly snowflake: Snowflake;

  private readonly device: GPUDevice;
  private readonly ctx: GPUCanvasContext;
  private readonly canvasFormat: GPUTextureFormat;
  private readonly gpuTimer: GPUTimer;

  private readonly computeShaders: {
    renderCells: RenderCells;
    stage1: Stage1;
  };

  private initialised: boolean;

  private renderSettingsBuffer!: GPUBuffer;
  private renderBindGroupLayout!: GPUBindGroupLayout;
  private renderBindGroup!: GPUBindGroup;
  private renderPipeline!: GPURenderPipeline;
  private sampler!: GPUSampler;

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
    this.snowflake = new Snowflake(50).initialise(this.device);
    this.computeShaders = {
      renderCells: new RenderCells(this),
      stage1: new Stage1(this),
    };

    this.gpuTimer = new GPUTimer(
      this.device,
      (_, totalTime) => {
        const microseconds = totalTime / 1e3;
        const milliseconds = totalTime / 1e6;
        const seconds = totalTime / 1e9;
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
      },
      1
    );

    this.initialised = false;
    this.settings = {
      timing: settings.timing,
    };
  }

  private serialiseRenderSettings(): ArrayBuffer {
    const bufferWriter = new BufferWriter(Renderer.RENDER_SETTINGS_BYTE_LENGTH);

    return bufferWriter.buffer;
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
          resource: this.computeShaders.renderCells.renderTexture.createView(),
        },
        {
          binding: 2,
          resource: this.sampler,
        },
      ],
    });
  }

  public async initialise(): Promise<void> {
    if (this.initialised) {
      return;
    }

    await this.computeShaders.renderCells.initialise(this.device);
    await this.computeShaders.stage1.initialise(this.device);
    await this.initialiseRendering();

    this.updateSettings();

    new ResizeObserver((entries) => {
      const canvas = entries[0];

      const width = canvas.devicePixelContentBoxSize[0].inlineSize;
      const height = canvas.devicePixelContentBoxSize[0].blockSize;

      this.canvas.width = width;
      this.canvas.height = height;

      this.gpuTimer.reset();

      this.computeShaders.renderCells.updateRenderTextureAndBindGroups();
      this.renderBindGroup = this.createRenderBindGroup();

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

    this.sampler = this.device.createSampler({
      label: "Renderer Texture Sampler",
      minFilter: "linear",
      magFilter: "linear",
    });

    const shader = await Shader.fetch(
      this.device,
      resolveBasePath("shaders/renderTexture.wgsl")
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

  public updateSettings(): void {
    this.device.queue.writeBuffer(
      this.renderSettingsBuffer,
      0,
      this.serialiseRenderSettings()
    );
  }

  public render(): void {
    this.computeShaders.stage1.run();
    this.computeShaders.renderCells.run();
    this.renderToCanvas();
  }

  private renderToCanvas(): void {
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = this.gpuTimer.beginRenderPass(commandEncoder, {
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
