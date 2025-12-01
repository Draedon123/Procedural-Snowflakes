import { GPUTimer } from "../../utils/GPUTimer";
import { Shader } from "../Shader";

abstract class ComputeShader {
  private readonly path: string;

  public shader!: Shader;
  protected device!: GPUDevice;
  private gpuTimer!: GPUTimer;

  protected abstract bindGroup: GPUBindGroup;
  protected abstract computePipeline: GPUComputePipeline;

  constructor(path: string) {
    this.path = path;
  }

  public get initialised(): boolean {
    return this.shader !== undefined;
  }

  public async initialise(device: GPUDevice): Promise<void> {
    if (this.initialised) {
      return;
    }

    this.device = device;
    this.gpuTimer = new GPUTimer(device, undefined, 1);
    this.shader = await Shader.fetch(device, this.path);
  }

  public run(): void {
    if (!this.initialised) {
      return;
    }

    const commandEncoder = this.device.createCommandEncoder();
    const computePass = this.gpuTimer.beginComputePass(commandEncoder);

    computePass.setBindGroup(0, this.bindGroup);
    computePass.setPipeline(this.computePipeline);

    computePass.dispatchWorkgroups(...this.workgroupSize);
    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  protected abstract get workgroupSize(): [number, number?, number?];
}

export { ComputeShader };
