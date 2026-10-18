/**
 * Optional reaction-time-free pulse driver for Lumen Relay live-routing spikes.
 * This module is deliberately engine-agnostic: supply initialPulse and stepPulse
 * from whichever spike is adopted. No timers, DOM, or animation state.
 */
export function createStepSession(level, { initialPulse, stepPulse }, initialMirrors) {
  if (typeof initialPulse !== "function" || typeof stepPulse !== "function") {
    throw new TypeError("A pulse engine with initialPulse and stepPulse is required");
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
      if (pulse.outcome !== "moving") return this.snapshot;
      mirrors = nextMirrors;
      return this.snapshot;
    },
    advance() {
      if (pulse.outcome !== "moving") return this.snapshot;
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
