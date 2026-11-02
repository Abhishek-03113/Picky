import type { SetupStep } from "../extension/extension-setup.ts";

/** Numbered setup steps as a row of tiles. */
export function SetupSteps({ steps }: { steps: readonly SetupStep[] }) {
  return (
    <ol className="steps">
      {steps.map((step, index) => (
        <li key={step.title}>
          <span className="step-number">{index + 1}</span>
          <span className="step-title">{step.title}</span>
          <span className="step-hint">{step.hint}</span>
        </li>
      ))}
    </ol>
  );
}
