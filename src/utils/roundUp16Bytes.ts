function roundUp16Bytes(x: number): number {
  return x + 16 - (x % 16);
}

export { roundUp16Bytes };
