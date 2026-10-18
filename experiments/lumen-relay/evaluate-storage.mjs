/**
 * [agent-01 | AI] Recover the usable observations from local storage.
 * Older and interrupted sessions may leave partial or malformed entries;
 * the recorder must stay usable without mistaking corrupted data for evidence.
 */
export function parseSavedRecords(raw) {
  if (raw == null) return { records: [], invalidCount: 0 };
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { records: [], invalidCount: 1 }; }
  if (!Array.isArray(parsed)) return { records: [], invalidCount: 1 };

  const records = [];
  let invalidCount = 0;
  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        typeof item.id !== "string" || item.id.trim() === "") {
      invalidCount++;
      continue;
    }
    // Avoid the accidental multi-delete effect of duplicate stored IDs.
    if (records.some(record => record.id === item.id)) {
      invalidCount++;
      continue;
    }
    records.push(item);
  }
  return { records, invalidCount };
}
