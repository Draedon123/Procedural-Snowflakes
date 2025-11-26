import { Renderer } from "./engine/Renderer";

function initialiseConfigPanel(renderer: Renderer): void {
  initialiseChevron();

  initialiseSlider("alpha", {
    decimalPlaces: 2,
    onChange: (value) => (renderer.computeShaders.stage2.alpha = value),
  });

  initialiseSlider("beta", {
    decimalPlaces: 2,
    onChange: (value) => (renderer.computeShaders.stage2.beta = value),
  });

  initialiseSlider("gamma", {
    decimalPlaces: 4,
    onChange: (value) => (renderer.computeShaders.stage2.gamma = value),
    processValue: (value) =>
      -2.59216 * value ** 5 +
      3.51994 * value ** 4 +
      -0.38784 * value ** 3 +
      0.386606 * value ** 2 +
      0.0735023 * value,
  });
}

function initialiseChevron(): void {
  const chevron = document.getElementById("chevron");
  const panel = document.getElementById("content");

  if (chevron === null) {
    throw new Error("Could not find chevron element");
  }

  if (panel === null) {
    throw new Error("Could not find info panel");
  }

  chevron.addEventListener("click", () => {
    chevron.classList.toggle("collapsed");
    panel.classList.toggle("collapsed");
  });
}

type SliderOptions = {
  onChange: (value: number) => unknown;
  processValue: (value: number) => number;
} & (
  | {
      processText: SliderTextProcess;
    }
  | {
      decimalPlaces: number;
    }
);

type SliderTextProcess = (value: number) => string;

function initialiseSlider(
  id: string,
  options: Partial<SliderOptions> = {}
): void {
  const sliderID = `${id}Input`;
  const valueDisplayID = `${id}Value`;
  const slider = document.getElementById(sliderID) as HTMLInputElement | null;
  const valueDisplay = document.getElementById(valueDisplayID);

  if (slider === null) {
    throw new Error(`Could not find slider with id ${sliderID}`);
  }

  if (valueDisplay === null) {
    throw new Error(`Could not find value display with id ${valueDisplay}`);
  }

  slider.addEventListener("change", () => {
    const processValue: SliderOptions["processValue"] =
      options.processValue ?? ((value) => value);
    const processText: SliderTextProcess =
      "processText" in options && options.processText !== undefined
        ? options.processText
        : "decimalPlaces" in options
          ? (value) => `(${value.toFixed(options.decimalPlaces)})`
          : (value) => `(${value.toString()})`;
    const value = processValue(parseFloat(slider.value));
    valueDisplay.textContent = processText(value);

    options.onChange?.(value);
  });
}

export { initialiseConfigPanel };
