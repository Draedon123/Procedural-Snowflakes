import { resolveBasePath } from "../../utils/resolveBasePath";
import { roundUp16Bytes } from "../../utils/roundUp16Bytes";
import { Renderer } from "../Renderer";
import { ComputeShader } from "./ComputeShader";

class RenderCells extends ComputeShader {
  private static readonly SETTINGS_BYTE_LENGTH = roundUp16Bytes(1 * 4);

  protected override bindGroup!: GPUBindGroup;
  protected override computePipeline!: GPUComputePipeline;

  private readonly renderer: Renderer;
  public settingsBuffer!: GPUBuffer;
  private bindGroupLayout!: GPUBindGroupLayout;

  public renderTexture!: GPUTexture;

  constructor(renderer: Renderer) {
    super(resolveBasePath("shaders/renderCells.wgsl"));

    this.renderer = renderer;
  }

  public override async initialise(device: GPUDevice): Promise<void> {
    if (this.initialised) {
      return;
    }

    await super.initialise(device);

    this.settingsBuffer = device.createBuffer({
      label: "Render Cells Shader Settings Buffer",
      size: RenderCells.SETTINGS_BYTE_LENGTH,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      label: "Render Cells Shader Bind Group Layout",
      entries: [
        {
          binding: 0,
          buffer: { type: "storage" },
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 1,
          buffer: { type: "storage" },
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 2,
          storageTexture: {
            access: "write-only",
            format: "rgba8unorm",
          },
          visibility: GPUShaderStage.COMPUTE,
        },
      ],
    });

    const computePipelineLayout = device.createPipelineLayout({
      label: "Render Cells Shader Compute Pipeline Layout",
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.updateRenderTextureAndBindGroups();

    this.computePipeline = device.createComputePipeline({
      label: "Render Cells Shader Compute Pipeline",
      layout: computePipelineLayout,
      compute: {
        module: this.shader.shader,
        entryPoint: "main",
      },
    });
  }

  public override get workgroupSize(): [number, number, number] {
    return [
      Math.ceil(this.renderer.canvas.width / 8),
      Math.ceil(this.renderer.canvas.height / 8),
      1,
    ];
  }

  public updateRenderTextureAndBindGroups(): void {
    this.renderTexture?.destroy();
    this.renderTexture = this.createRenderTexture();
    this.bindGroup = this.device.createBindGroup({
      label: "Render Cells Shader Bind Group",
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.settingsBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.renderer.snowflake.cellBuffer },
        },
        {
          binding: 2,
          resource: this.renderTexture.createView(),
        },
      ],
    });
  }

  private createRenderTexture(): GPUTexture {
    return this.device.createTexture({
      label: "Render Texture",
      format: "rgba8unorm",
      size: [this.renderer.canvas.width, this.renderer.canvas.height],
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }
}

export { RenderCells };
