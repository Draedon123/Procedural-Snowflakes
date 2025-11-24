import { RollingAverage } from "./RollingAverage";

type GPUTimerOnUpdate = (time: number, linkedTimerSum: number) => unknown;

class GPUTimer {
  private static readonly linkedTimers: Record<number, GPUTimer[]> = {};

  public readonly canTimestamp: boolean;

  private readonly querySet!: GPUQuerySet;
  private readonly resolveBuffer!: GPUBuffer;
  private readonly resultBuffer!: GPUBuffer;

  private readonly rollingAverage: RollingAverage;

  public onUpdate: GPUTimerOnUpdate;

  constructor(
    device: GPUDevice,
    onUpdate: GPUTimerOnUpdate = () => {},
    linkId: number | null = null
  ) {
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
        size: this.querySet.count * 8,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });

      this.resultBuffer = device.createBuffer({
        label: "GPUTimer Result Buffer",
        size: this.resolveBuffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }

    const originalSubmitMethod = device.queue.submit.bind(device.queue);
    device.queue.submit = (commandBuffers: Iterable<GPUCommandBuffer>) => {
      originalSubmitMethod(commandBuffers);

      if (!this.canTimestamp) {
        return;
      }

      device.queue.onSubmittedWorkDone().then(() => {
        if (this.resultBuffer.mapState !== "unmapped") {
          return;
        }

        this.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
          const times = new BigInt64Array(this.resultBuffer.getMappedRange());

          this.rollingAverage.addSample(Number(times[1] - times[0]));
          this.resultBuffer.unmap();

          const time = this.rollingAverage.average;
          const linkedTimerSum =
            linkId === null
              ? time
              : GPUTimer.linkedTimers[linkId].reduce(
                  (total, current) => total + current.time,
                  0
                );

          this.onUpdate(time, linkedTimerSum);
        });
      });
    };

    if (linkId !== null) {
      if (!(linkId in GPUTimer.linkedTimers)) {
        GPUTimer.linkedTimers[linkId] = [];
      }

      GPUTimer.linkedTimers[linkId].push(this);
    }
  }

  public get time(): number {
    return this.rollingAverage.average;
  }

  private beginPass(
    commandEncoder: GPUCommandEncoder,
    passType: "render",
    descriptor: Omit<GPURenderPassDescriptor, "timestampWrites">
  ): GPURenderPassEncoder;
  private beginPass(
    commandEncoder: GPUCommandEncoder,
    passType: "compute",
    descriptor: Omit<GPUComputePassDescriptor, "timestampWrites">
  ): GPUComputePassEncoder;
  private beginPass(
    commandEncoder: GPUCommandEncoder,
    passType: "render" | "compute",
    descriptor: Omit<
      GPURenderPassDescriptor | GPUComputePassDescriptor,
      "timestampWrites"
    >
  ): GPUComputePassEncoder | GPURenderPassEncoder {
    const timestampWrites:
      | GPURenderPassTimestampWrites
      | GPUComputePassTimestampWrites = {
      querySet: this.querySet,
      beginningOfPassWriteIndex: 0,
      endOfPassWriteIndex: 1,
    };

    const beginPass =
      commandEncoder[
        passType === "render" ? "beginRenderPass" : "beginComputePass"
      ].bind(commandEncoder);

    // @ts-expect-error don't know how to fix this error but i swear i works
    const pass = beginPass({
      ...descriptor,
      ...(this.canTimestamp ? { timestampWrites } : undefined),
    });

    const originalEndMethod = pass.end.bind(pass);
    pass.end = () => {
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

    return pass;
  }

  public beginComputePass(
    commandEncoder: GPUCommandEncoder,
    descriptor: Omit<GPUComputePassDescriptor, "timestampWrites"> = {}
  ): GPUComputePassEncoder {
    return this.beginPass(commandEncoder, "compute", descriptor);
  }

  public beginRenderPass(
    commandEncoder: GPUCommandEncoder,
    descriptor: Omit<GPURenderPassDescriptor, "timestampWrites">
  ): GPURenderPassEncoder {
    return this.beginPass(commandEncoder, "render", descriptor);
  }

  public reset(): void {
    this.rollingAverage.reset();
  }
}

export { GPUTimer };
export type { GPUTimerOnUpdate };
