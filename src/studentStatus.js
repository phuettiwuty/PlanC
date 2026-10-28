const STATUS_FIELDS = [
  "stdStatusDescTh",
  "studentStatusDescTh",
  "studentStatusDescriptionTh",
  "stdStatusNameTh",
  "studentStatusNameTh",
  "stdStatusDesc",
  "studentStatusDesc",
  "studentStatusDescription",
  "stdStatusName",
  "studentStatusName",
  "stdStatus",
  "studentStatus",
  "academicStatus",
  "statusDescTh",
  "statusDescriptionTh",
  "statusNameTh",
];

const STATUS_LABEL_FIELDS = [
  "descriptionTh",
  "descTh",
  "nameTh",
  "labelTh",
  "description",
  "desc",
  "name",
  "label",
  "text",
  "value",
];

const API_STATUS_VALUES = new Set(["success", "ok", "true", "false", "200"]);

function normalizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getStatusText(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const text = value.trim();
  return API_STATUS_VALUES.has(text.toLowerCase()) ? "" : text;
}

function findStatusLabel(value, depth) {
  if (!value || typeof value !== "object" || depth > 8) return "";
  const entries = Object.entries(value);

  for (const field of STATUS_LABEL_FIELDS) {
    const entry = entries.find(([key]) => normalizeKey(key) === normalizeKey(field));
    if (entry && typeof entry[1] === "string" && entry[1].trim()) {
      return entry[1].trim();
    }
  }

  for (const [, candidate] of entries) {
    const nestedLabel = findStatusLabel(candidate, depth + 1);
    if (nestedLabel) return nestedLabel;
  }

  return "";
}

function findStatusValue(value, depth) {
  if (!value || typeof value !== "object" || depth > 8) return "";

  const entries = Object.entries(value);
  for (const field of STATUS_FIELDS) {
    const normalizedField = normalizeKey(field);
    const entry = entries.find(([key]) => normalizeKey(key) === normalizedField);
    if (!entry) continue;

    const [, candidate] = entry;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (candidate && typeof candidate === "object") {
      const nestedStatus =
        findStatusValue(candidate, depth + 1) || findStatusLabel(candidate, depth + 1);
      if (nestedStatus) return nestedStatus;
    }
  }

  for (const [key, candidate] of entries) {
    const normalizedKey = normalizeKey(key);
    if (
      /^(std|student|academic).*(status|standing)$/.test(normalizedKey) ||
      /^(status|standing).*(std|student|academic)$/.test(normalizedKey)
    ) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      if (candidate && typeof candidate === "object") {
        const nestedStatus =
          findStatusValue(candidate, depth + 1) || findStatusLabel(candidate, depth + 1);
        if (nestedStatus) return nestedStatus;
      }
    }
  }

  for (const [, candidate] of entries) {
    const nestedStatus = findStatusValue(candidate, depth + 1);
    if (nestedStatus) return nestedStatus;
  }

  return "";
}

function findGenericStatus(value, depth) {
  if (!value || typeof value !== "object" || depth > 8) return "";

  for (const [key, candidate] of Object.entries(value)) {
    if (normalizeKey(key) !== "status") continue;
    const text = getStatusText(candidate);
    if (text) return text;
    if (candidate && typeof candidate === "object") {
      const nestedStatus =
        findStatusValue(candidate, depth + 1) || findStatusLabel(candidate, depth + 1);
      if (nestedStatus) return nestedStatus;
    }
  }

  for (const [, candidate] of Object.entries(value)) {
    const nestedStatus = findGenericStatus(candidate, depth + 1);
    if (nestedStatus) return nestedStatus;
  }

  return "";
}

export function findStudentStatus(value) {
  return findStatusValue(value, 0) || findGenericStatus(value, 0);
}
