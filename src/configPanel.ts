import { Renderer } from "./engine/Renderer";

function initialiseConfigPanel(renderer: Renderer): void {
  initialiseChevron();

  initialiseSlider("alpha", {
    decimalPlaces: 2,
    onChange: (alpha) => (renderer.computeShaders.stage2.alpha = alpha),
  });

  initialiseSlider("beta", {
    decimalPlaces: 2,
    onChange: (beta) => (renderer.computeShaders.stage2.beta = beta),
  });

  function scaleGamma(gamma: number): number {
    return (
      -2.59216 * gamma ** 5 +
      3.51994 * gamma ** 4 +
      -0.38784 * gamma ** 3 +
      0.386606 * gamma ** 2 +
      0.0735023 * gamma
    );
  }
  initialiseSlider("gamma", {
    decimalPlaces: 4,
    onChange: (gamma) => (renderer.computeShaders.stage2.gamma = gamma),
    processValue: scaleGamma,
    initialise: (input) => {
      const initialValue = parseFloat(input.value);
      let unscaledX = initialValue;
      let scaledX = scaleGamma(unscaledX);

      let minUnscaled = 0;
      let maxUnscaled = 1;

      while (Math.abs(initialValue - scaledX) >= 1e-4) {
        if (scaledX > initialValue) {
          maxUnscaled = unscaledX;
        } else {
          minUnscaled = unscaledX;
        }

        unscaledX = (maxUnscaled + minUnscaled) / 2;
        scaledX = scaleGamma(unscaledX);
      }

      input.value = unscaledX.toString();
    },
  });

  initialiseSlider("speed", {
    processText: (speed) => `(${speed}x)`,
    onChange: (speed) => (renderer.settings.speed = speed),
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
  initialise: (input: HTMLInputElement) => unknown;
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

  const initialise = options.initialise ?? (() => {});
  initialise(slider);

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
