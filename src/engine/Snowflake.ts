import { clamp } from "../utils/clamp";

class Snowflake {
  public static readonly MAX_RADIUS: number = 100;

  private static readonly CELL_BYTE_LENGTH: number = 4;
  private static readonly BYTE_LENGTH: number =
    4 +
    4 *
      Snowflake.MAX_RADIUS *
      Snowflake.MAX_RADIUS *
      Snowflake.CELL_BYTE_LENGTH;

  private _radius: number;
  private device!: GPUDevice;
  public buffer!: GPUBuffer;

  constructor(radius: number) {
    this._radius = radius;
  }

  public initialise(device: GPUDevice): this {
    if (this.initialised) {
      return this;
    }

    this.device = device;

    this.buffer = device.createBuffer({
      label: "Snowflake Buffer",
      size: Snowflake.BYTE_LENGTH,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.update();

    return this;
  }

  private update(): void {
    if (this.initialised) {
      return;
    }

    this.device.queue.writeBuffer(
      this.buffer,
      0,
      new Uint32Array([this.radius])
    );
  }

  public get initialised(): boolean {
    return this.buffer !== undefined;
  }

  public get radius(): number {
    return this._radius;
  }

  public set radius(radius: number) {
    this._radius = clamp(radius, 1, Snowflake.MAX_RADIUS);
    this.update();
  }
}

export { Snowflake };
