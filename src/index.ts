import "./style.css";
import { Renderer } from "./engine/Renderer";
import { initialiseConfigPanel } from "./configPanel";

async function main(): Promise<void> {
  const canvas = document.getElementById("main") as HTMLCanvasElement;
  const frameTimeElement = document.getElementById("frameTime") as HTMLElement;
  const fpsElement = document.getElementById("fps") as HTMLElement;
  const renderer = await Renderer.create(canvas, {
    speed: 5,
    timing: {
      frameTimeElement,
      fpsElement,
    },
  });

  await renderer.initialise();
  renderer.snowflake.radius = 200;
  renderer.snowflake.update(renderer.computeShaders.stage2.beta);

  initialiseConfigPanel(renderer);

  renderer.loop.start();
}

main().catch((error) => {
  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);
  const alertElement = document.getElementById("alert") as HTMLElement;
  const errorElement = document.getElementById("error") as HTMLElement;
  const iframe = document.getElementById("fallback") as HTMLIFrameElement;

  alertElement.style.zIndex = "999";

  errorElement.classList.add("error");
  errorElement.textContent = errorMessage;

  iframe.src = "https://www.youtube.com/embed/hyhJWh_Vt0w";
  iframe.classList.remove("hidden");

  console.error(errorMessage);
});
