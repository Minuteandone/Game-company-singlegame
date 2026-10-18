/** Return an explicitly supported recorder candidate or null. */
export function selectRecorderCandidate(search = "", candidates = {}) {
  const id = new URLSearchParams(search).get("candidate");
  return id && Object.hasOwn(candidates, id) ? id : null;
}
