
import React from 'react';
import { PivotStyleRule, ConditionalFormattingRule } from '../types';

export const getCellStyle = (
  rowKeys: string[],
  col: string,
  value: any,
  metricLabel: string,
  styleRules: PivotStyleRule[],
  conditionalRules: ConditionalFormattingRule[],
  isSubtotal: boolean = false
): React.CSSProperties => {
  let finalStyle: React.CSSProperties = {};

  // 1. Manual rules
  styleRules.forEach(rule => {
    let match = false;
    if (rule.targetType === 'metric') {
      if (!rule.targetKey || rule.targetKey === metricLabel) match = true;
    } else if (rule.targetType === 'row') {
      if (rowKeys.includes(rule.targetKey!)) match = true;
    } else if (rule.targetType === 'col') {
      if (col === rule.targetKey || col.includes(`\x1F${rule.targetKey}`) || (metricLabel && metricLabel === rule.targetKey)) match = true;
    } else if (rule.targetType === 'cell') {
      // Precise cell match
      const rowMatch = !rule.targetRowPath || (rule.targetRowPath.length === rowKeys.length && rule.targetRowPath.every((k, i) => k === rowKeys[i]));
      const colMatch = !rule.targetColLabel || rule.targetColLabel === col;
      if (rowMatch && colMatch) match = true;
    }

    if (match) {
      if (rule.style.backgroundColor) finalStyle.backgroundColor = rule.style.backgroundColor;
      if (rule.style.textColor) finalStyle.color = rule.style.textColor;
      if (rule.style.fontWeight) finalStyle.fontWeight = rule.style.fontWeight;
      if (rule.style.fontStyle) finalStyle.fontStyle = rule.style.fontStyle;
    }
  });

  // 2. Conditional rules (only for numeric or matching values)
  if (value !== undefined && value !== null) {
    conditionalRules.forEach(rule => {
      // Filter by scope
      if (rule.scope === 'data' && (isSubtotal || col === 'Total')) return;
      if (rule.scope === 'totals' && !isSubtotal && col !== 'Total') return;

      // Filter by metric
      if (rule.metricLabel && rule.metricLabel !== metricLabel) return;

      // Filter by selection (if provided)
      if (rule.targetRowPath || rule.targetColLabel) {
        const rowMatch = !rule.targetRowPath || (rule.targetRowPath.length === rowKeys.length && rule.targetRowPath.every((k, i) => k === rowKeys[i]));
        const colMatch = !rule.targetColLabel || rule.targetColLabel === col;
        if (!rowMatch || !colMatch) return;
      }

      let match = false;
      const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
      const ruleVal = typeof rule.value === 'number' ? rule.value : parseFloat(String(rule.value));

      switch (rule.operator) {
        case 'gt': match = !isNaN(numVal) && numVal > ruleVal; break;
        case 'lt': match = !isNaN(numVal) && numVal < ruleVal; break;
        case 'eq': match = numVal === ruleVal || String(value) === String(rule.value); break;
        case 'between': match = !isNaN(numVal) && numVal >= ruleVal && numVal <= (rule.value2 || 0); break;
        case 'contains': match = String(value).toLowerCase().includes(String(rule.value).toLowerCase()); break;
      }

      if (match) {
        if (rule.style.backgroundColor) finalStyle.backgroundColor = rule.style.backgroundColor;
        if (rule.style.textColor) finalStyle.color = rule.style.textColor;
        if (rule.style.fontWeight) finalStyle.fontWeight = rule.style.fontWeight;
      }
    });
  }

  return finalStyle;
};
