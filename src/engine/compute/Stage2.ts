import { clamp } from "../../utils/clamp";
import { resolveBasePath } from "../../utils/resolveBasePath";
import { roundUp16Bytes } from "../../utils/roundUp16Bytes";
import { Renderer } from "../Renderer";
import { ComputeShader } from "./ComputeShader";

class Stage2 extends ComputeShader {
  private static readonly SETTINGS_BYTE_LENGTH: number = roundUp16Bytes(3 * 4);
  private static readonly FINISHED_BUFFER_BYTE_LENGTH: number = 1 * 4;

  protected override bindGroup!: GPUBindGroup;
  protected override computePipeline!: GPUComputePipeline;

  private readonly renderer: Renderer;
  public settingsBuffer!: GPUBuffer;
  public finishedBuffer!: GPUBuffer;

  private _alpha!: number;
  private _beta!: number;
  private _gamma!: number;
  constructor(renderer: Renderer) {
    super(resolveBasePath("shaders/stage2.wgsl"));

    this.renderer = renderer;

    this.alpha = 1.592;
    this.beta = 0.3;
    this.gamma = 0.001;
  }

  public override async initialise(device: GPUDevice): Promise<void> {
    if (this.initialised) {
      return;
    }

    await super.initialise(device);

    this.settingsBuffer = device.createBuffer({
      label: "Stage 2 Shader Settings Buffer",
      size: Stage2.SETTINGS_BYTE_LENGTH,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.finishedBuffer = device.createBuffer({
      label: "Stage 2 Shader Finished Buffer",
      size: Stage2.FINISHED_BUFFER_BYTE_LENGTH,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      label: "Stage 2 Shader Bind Group Layout",
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
        {
          binding: 2,
          buffer: { type: "storage" },
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 3,
          buffer: { type: "storage" },
          visibility: GPUShaderStage.COMPUTE,
        },
      ],
    });

    const computePipelineLayout = device.createPipelineLayout({
      label: "Stage 2 Shader Compute Pipeline Layout",
      bindGroupLayouts: [bindGroupLayout],
    });

    this.bindGroup = device.createBindGroup({
      label: "Stage 2 Shader Bind Group",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.settingsBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.renderer.snowflake.buffer },
        },
        {
          binding: 2,
          resource: {
            buffer: this.renderer.computeShaders.renderCells.settingsBuffer,
          },
        },
        {
          binding: 3,
          resource: { buffer: this.finishedBuffer },
        },
      ],
    });

    this.computePipeline = device.createComputePipeline({
      label: "Stage 2 Shader Compute Pipeline",
      layout: computePipelineLayout,
      compute: {
        module: this.shader.shader,
        entryPoint: "main",
      },
    });
  }

  public override get workgroupSize(): [number, number, number] {
    return [
      Math.ceil((2 * (this.renderer.snowflake.radius + 1)) / 8),
      Math.ceil((2 * (this.renderer.snowflake.radius + 1)) / 8),
      1,
    ];
  }

  public reset(): void {
    if (!this.initialised) {
      return;
    }

    this.device.queue.writeBuffer(this.finishedBuffer, 0, new Uint32Array([0]));
  }

  private updateSettings(): void {
    if (!this.initialised) {
      return;
    }

    this.device.queue.writeBuffer(
      this.settingsBuffer,
      0,
      new Float32Array([this.alpha, this.beta, this.gamma])
    );
  }

  public get alpha(): number {
    return this._alpha;
  }

  public get beta(): number {
    return this._beta;
  }

  public get gamma(): number {
    return this._gamma;
  }

  public set alpha(alpha: number) {
    this._alpha = Math.max(alpha, 0);
    this.update();
  }

  public set beta(beta: number) {
    this._beta = clamp(beta, 0, 1);
    this.update();
  }

  public set gamma(gamma: number) {
    this._gamma = clamp(gamma, 0, 1);
    this.update();
  }

  public update(): void {
    this.updateSettings();
    this.reset();
    this.renderer.snowflake.update(this.beta);
  }
}

export { Stage2 };
