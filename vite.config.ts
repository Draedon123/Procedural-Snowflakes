import { defineConfig } from "vite";

const additionalHMR: RegExp = /\.wgsl$/;

export default defineConfig({
  build: {
    target: "esnext",
    outDir: "build",
    emptyOutDir: true,
  },
  base: "/Procedural-Snowflakes",
  publicDir: "assets",
  plugins: [
    {
      name: "Additional HMR",
      handleHotUpdate(ctx) {
        if (!ctx.file.match(additionalHMR)) {
          return;
        }

        ctx.server.ws.send({ type: "full-reload" });
      },
    },
  ],
});
