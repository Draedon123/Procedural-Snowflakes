class Shader {
  public readonly shader: GPUShaderModule;
  constructor(device: GPUDevice, code: string, label?: string) {
    this.shader = device.createShaderModule({
      label,
      code,
    });
  }

  public static async fetch(
    device: GPUDevice,
    url: string,
    label?: string
  ): Promise<Shader> {
    const raw = await (await fetch(url)).text();
    const processed = await Shader.preprocess(url, raw);

    return new Shader(device, processed, label);
  }

  private static async preprocess(url: string, code: string): Promise<string> {
    return Shader.resolveImports(url, code);
  }

  private static async resolveImports(
    url: string,
    code: string,
    imported: string[] = []
  ): Promise<string> {
    const IMPORT_MATCH: RegExp = /#!import.*\s/g;

    const splitURL = url.split("/");
    const directory = splitURL.slice(0, splitURL.length - 1).join("/") + "/";
    const imports =
      code
        .match(IMPORT_MATCH)
        ?.map((match) => match.replaceAll(/(#!import)|\s/g, ""))
        .filter((imports) => !imported.includes(imports))
        .map((url) => directory + url + ".wgsl") ?? [];

    const importedCode = await Promise.all(
      imports.map(async (url) => {
        const code = await (await fetch(url)).text();

        return Shader.resolveImports(url, code, imported);
      })
    );

    return (importedCode.join("") + code).replaceAll(IMPORT_MATCH, "");
  }
}

export { Shader };
