import { resolveBasePath } from "../../utils/resolveBasePath";
import { Renderer } from "../Renderer";
import { ComputeShader } from "./ComputeShader";

class PostRender extends ComputeShader {
  protected override bindGroup!: GPUBindGroup;
  protected override computePipeline!: GPUComputePipeline;

  private readonly renderer: Renderer;
  constructor(renderer: Renderer) {
    super(resolveBasePath("shaders/postRender.wgsl"));

    this.renderer = renderer;
  }

  public override async initialise(device: GPUDevice): Promise<void> {
    if (this.initialised) {
      return;
    }

    await super.initialise(device);

    const bindGroupLayout = device.createBindGroupLayout({
      label: "Post Render Shader Bind Group Layout",
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
      ],
    });

    const computePipelineLayout = device.createPipelineLayout({
      label: "Post Render Shader Compute Pipeline Layout",
      bindGroupLayouts: [bindGroupLayout],
    });

    this.bindGroup = device.createBindGroup({
      label: "Post Render Shader Bind Group",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.renderer.computeShaders.stage2.finishedBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.renderer.computeShaders.renderCells.settingsBuffer,
          },
        },
      ],
    });

    this.computePipeline = device.createComputePipeline({
      label: "Post Render Shader Compute Pipeline",
      layout: computePipelineLayout,
      compute: {
        module: this.shader.shader,
        entryPoint: "main",
      },
    });
  }

  public override get workgroupSize(): [number, number?, number?] {
    return [1];
  }
}

export { PostRender };
