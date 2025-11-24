import { RollingAverage } from "./RollingAverage";

type GPUTimerOnUpdate = (time: number) => unknown;

class GPUTimer {
  private static readonly modifiedDevices: Set<GPUDevice> = new Set();

  public readonly canTimestamp: boolean;

  private readonly querySet!: GPUQuerySet;
  private readonly resolveBuffer!: GPUBuffer;
  private readonly resultBuffer!: GPUBuffer;

  private readonly rollingAverage: RollingAverage;

  public onUpdate: GPUTimerOnUpdate;

  constructor(device: GPUDevice, onUpdate: GPUTimerOnUpdate = () => {}) {
    this.canTimestamp = device.features.has("timestamp-query");
    this.onUpdate = onUpdate;
    this.rollingAverage = new RollingAverage(50);

    if (this.canTimestamp) {
      this.querySet = device.createQuerySet({
        label: "GPUTimer Query Set",
        type: "timestamp",
        count: 2,
      });

      this.resolveBuffer = device.createBuffer({
        label: "GPUTimer Resolve Buffer",
        size: this.querySet.count * BigInt64Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });

      this.resultBuffer = device.createBuffer({
        label: "GPUTimer Result Buffer",
        size: this.resolveBuffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }

    if (!GPUTimer.modifiedDevices.has(device)) {
      const originalSubmitMethod = device.queue.submit.bind(device.queue);
      device.queue.submit = (commandBuffers: Iterable<GPUCommandBuffer>) => {
        originalSubmitMethod(commandBuffers);

        if (!this.canTimestamp || this.resultBuffer.mapState !== "unmapped") {
          return;
        }

        this.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
          const times = new BigInt64Array(this.resultBuffer.getMappedRange());

          this.rollingAverage.addSample(Number(times[1] - times[0]));
          this.resultBuffer.unmap();

          this.onUpdate(this.rollingAverage.average);
        });
      };

      GPUTimer.modifiedDevices.add(device);
    }
  }

  public get time(): number {
    return this.rollingAverage.average;
  }

  public beginComputePass(
    commandEncoder: GPUCommandEncoder,
    descriptor?: Omit<GPUComputePassDescriptor, "timestampWrites">
  ): GPUComputePassEncoder {
    const timestampWrites: GPUComputePassTimestampWrites = {
      querySet: this.querySet,
      beginningOfPassWriteIndex: 0,
      endOfPassWriteIndex: 1,
    };

    const computePass = commandEncoder.beginComputePass({
      ...descriptor,
      ...(this.canTimestamp ? { timestampWrites } : undefined),
    });

    const originalEndMethod = computePass.end.bind(computePass);
    computePass.end = () => {
      originalEndMethod();

      if (!this.canTimestamp) {
        return;
      }

      commandEncoder.resolveQuerySet(
        this.querySet,
        0,
        this.querySet.count,
        this.resolveBuffer,
        0
      );

      if (this.resultBuffer.mapState === "unmapped") {
        commandEncoder.copyBufferToBuffer(
          this.resolveBuffer,
          this.resultBuffer
        );
      }
    };

    return computePass;
  }

  public reset(): void {
    this.rollingAverage.reset();
  }
}

export { GPUTimer };
export type { GPUTimerOnUpdate };
