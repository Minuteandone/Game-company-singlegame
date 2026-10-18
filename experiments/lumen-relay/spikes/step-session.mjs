/**
 * Timer-free controller for a one-cell pulse engine.
 * The default activity convention accepts null/undefined or "moving" outcomes.
 * Engines using other conventions may supply isActive(pulse).
 *
 * Engine contract:
 *   initialPulse(level) -> pulse
 *   stepPulse(level, pulse, mirrorState) -> nextPulse
 *   isActive(pulse) -> boolean (optional)
 */
export function createStepSession(
  level,
  { initialPulse, stepPulse, isActive = pulse => pulse.outcome == null || pulse.outcome === "moving" },
  initialMirrors
) {
  if (typeof initialPulse !== "function" || typeof stepPulse !== "function") {
    throw new TypeError("A pulse engine with initialPulse and stepPulse is required");
  }
  if (typeof isActive !== "function") {
    throw new TypeError("isActive must be a function");
  }
  let pulse = initialPulse(level);
  let mirrors = initialMirrors;
  let steps = 0;
  let generation = 0;
  return {
    get snapshot() {
      return { pulse: { ...pulse }, mirrors, steps, generation };
    },
    rotate(nextMirrors) {
      if (!isActive(pulse)) return this.snapshot;
      mirrors = nextMirrors;
      return this.snapshot;
    },
    advance() {
      if (!isActive(pulse)) return this.snapshot;
      pulse = stepPulse(level, pulse, mirrors);
      steps++;
      return this.snapshot;
    },
    reset(nextMirrors = initialMirrors) {
      generation++;
      mirrors = nextMirrors;
      pulse = initialPulse(level);
      steps = 0;
      return this.snapshot;
    }
  };
}
