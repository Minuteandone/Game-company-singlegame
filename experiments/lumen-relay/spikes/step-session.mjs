/**
 * Timer-free controller for a one-cell pulse engine.
 * Accepts both the baseline-style "moving" outcome and the live engine's null
 * outcome as active states; all other outcomes are terminal.
 *
 * Engine contract:
 *   initialPulse(level) -> pulse
 *   stepPulse(level, pulse, mirrorState) -> nextPulse
 */
export function createStepSession(level, { initialPulse, stepPulse }, initialMirrors) {
  if (typeof initialPulse !== "function" || typeof stepPulse !== "function") {
    throw new TypeError("A pulse engine with initialPulse and stepPulse is required");
  }
  const inFlight = pulse => pulse.outcome == null || pulse.outcome === "moving";
  let pulse = initialPulse(level);
  let mirrors = initialMirrors;
  let steps = 0;
  let generation = 0;
  return {
    get snapshot() {
      return { pulse: { ...pulse }, mirrors, steps, generation };
    },
    rotate(nextMirrors) {
      if (!inFlight(pulse)) return this.snapshot;
      mirrors = nextMirrors;
      return this.snapshot;
    },
    advance() {
      if (!inFlight(pulse)) return this.snapshot;
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
