import "./style.css";
import { Renderer } from "./engine/Renderer";
import { Loop } from "./utils/Loop";
import { initialiseConfigPanel } from "./configPanel";

async function main(): Promise<void> {
  const canvas = document.getElementById("main") as HTMLCanvasElement;
  const frameTimeElement = document.getElementById("frameTime") as HTMLElement;
  const fpsElement = document.getElementById("fps") as HTMLElement;
  const renderer = await Renderer.create(canvas, {
    timing: {
      frameTimeElement,
      fpsElement,
    },
  });

  await renderer.initialise();

  const loop = new Loop();

  initialiseConfigPanel();

  loop.addCallback(() => {
    renderer.render();
  });

  loop.start();
}

main().catch((error) => {
  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);
  const errorElement = document.getElementById("alert");

  if (errorElement !== null) {
    errorElement.style.zIndex = "999";
    errorElement.classList.add("error");
    errorElement.textContent = errorMessage;
  }

  console.error(errorMessage);
});
