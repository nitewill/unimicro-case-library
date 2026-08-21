export const conditionLabels = {
  column: "色谱柱 / 毛细管",
  mobilePhase: "流动相 / 缓冲体系",
  flowRate: "流速 / 分离电压",
  temperature: "柱温 / 温度",
  injection: "进样量 / 进样方式",
};

export function getConditionRows(applicationCase) {
  if (Array.isArray(applicationCase?.conditionRows)) {
    return applicationCase.conditionRows.map((row, index) => ({
      id: row.id || row.key || `condition-${index}`,
      key: row.key || `condition-${index}`,
      label: String(row.label || "").trim(),
      value: String(row.value || "").trim(),
    }));
  }
  return Object.entries(applicationCase?.conditions || {}).map(([key, value], index) => ({
    id: `legacy-${key}-${index}`,
    key,
    label: conditionLabels[key] || key,
    value: String(value || ""),
  }));
}

export function conditionRowsToLegacy(rows) {
  return Object.fromEntries(rows.map((row, index) => [row.key || `custom-${index + 1}`, row.value]));
}
