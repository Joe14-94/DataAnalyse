
import React from 'react';
import { PivotStyleRule, ConditionalFormattingRule } from '../types';

export const getCellStyle = (
  rowKeys: string[],
  col: string,
  value: any,
  metricLabel: string,
  styleRules: PivotStyleRule[],
  conditionalRules: ConditionalFormattingRule[],
  rowType: 'data' | 'subtotal' | 'grandTotal' = 'data'
): React.CSSProperties => {
  const finalStyle: React.CSSProperties = {};

  // 1. Manual rules
  styleRules.forEach(rule => {
    // Check scope
    if (rule.scope === 'data' && rowType !== 'data') return;
    if (rule.scope === 'totals' && rowType === 'data') return;

    let match = false;
    if (rule.targetType === 'metric') {
      if (!rule.targetKey || rule.targetKey === metricLabel) match = true;
    } else if (rule.targetType === 'row') {
      if (rowKeys.includes(rule.targetKey!)) match = true;
    } else if (rule.targetType === 'col') {
      if (col === rule.targetKey || col.includes(`\x1F${rule.targetKey}`) || (metricLabel && metricLabel === rule.targetKey)) match = true;
    } else if (rule.targetType === 'cell') {
      // Cell target key is usually "rowKey1\x1FrowKey2...|colLabel"
      if (rule.targetKey === `${rowKeys.join('\x1F')}|${col}`) match = true;
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
      if (rule.metricLabel && rule.metricLabel !== metricLabel) return;

      // Check scope
      if (rule.scope === 'data' && rowType !== 'data') return;
      if (rule.scope === 'totals' && rowType === 'data') return;

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
