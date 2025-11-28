import { resolveBasePath } from "../../utils/resolveBasePath";
import { Renderer } from "../Renderer";
import { ComputeShader } from "./ComputeShader";

class Initialise extends ComputeShader {
  protected override bindGroup!: GPUBindGroup;
  protected override computePipeline!: GPUComputePipeline;

  private readonly renderer: Renderer;
  constructor(renderer: Renderer) {
    super(resolveBasePath("shaders/initialise.wgsl"));

    this.renderer = renderer;
  }

  public override async initialise(device: GPUDevice): Promise<void> {
    if (this.initialised) {
      return;
    }

    await super.initialise(device);

    const bindGroupLayout = device.createBindGroupLayout({
      label: "Initialisation Shader Bind Group Layout",
      entries: [
        {
          binding: 0,
          buffer: { type: "uniform" },
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
      label: "Initialisation Shader Compute Pipeline Layout",
      bindGroupLayouts: [bindGroupLayout],
    });

    this.bindGroup = device.createBindGroup({
      label: "Initialisation Shader Bind Group",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.renderer.computeShaders.stage2.settingsBuffer,
          },
        },
        {
          binding: 1,
          resource: { buffer: this.renderer.snowflake.buffer },
        },
      ],
    });

    this.computePipeline = device.createComputePipeline({
      label: "Initialisation Shader Compute Pipeline",
      layout: computePipelineLayout,
      compute: {
        module: this.shader.shader,
        entryPoint: "main",
      },
    });
  }

  public override get workgroupSize(): [number, number, number] {
    return [
      Math.ceil((2 * this.renderer.snowflake.radius) / 8) + 1,
      Math.ceil((2 * this.renderer.snowflake.radius) / 8) + 1,
      1,
    ];
  }
}

export { Initialise };
