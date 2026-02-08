
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
  let finalStyle: React.CSSProperties = {};

  // BOLT OPTIMIZATION: Pre-calculate joined keys once per cell instead of per rule
  const joinedRowKeys = rowKeys.join('\x1F');
  const cellKey = joinedRowKeys + '|' + col;

  // 1. Manual rules
  // BOLT OPTIMIZATION: Use standard for loop for better performance in hot render path
  for (let i = 0; i < styleRules.length; i++) {
    const rule = styleRules[i];

    // Check scope
    if (rule.scope === 'data' && rowType !== 'data') continue;
    if (rule.scope === 'totals' && rowType === 'data') continue;

    let match = false;
    const targetType = rule.targetType;
    const targetKey = rule.targetKey;

    if (targetType === 'metric') {
      if (!targetKey || targetKey === metricLabel) match = true;
    } else if (targetType === 'row') {
      // Still O(M) but avoids join()
      if (rowKeys.includes(targetKey!)) match = true;
    } else if (targetType === 'col') {
      if (col === targetKey || col.includes(`\x1F${targetKey}`) || (metricLabel && metricLabel === targetKey)) match = true;
    } else if (targetType === 'cell') {
      // BOLT OPTIMIZATION: Use pre-calculated cellKey
      if (targetKey === cellKey) match = true;
    }

    if (match) {
      const rs = rule.style;
      if (rs.backgroundColor) finalStyle.backgroundColor = rs.backgroundColor;
      if (rs.textColor) finalStyle.color = rs.textColor;
      if (rs.fontWeight) finalStyle.fontWeight = rs.fontWeight;
      if (rs.fontStyle) finalStyle.fontStyle = rs.fontStyle;
    }
  }

  // 2. Conditional rules (only for numeric or matching values)
  if (value !== undefined && value !== null) {
    const valStr = String(value);
    const valLower = valStr.toLowerCase();
    const numVal = typeof value === 'number' ? value : parseFloat(valStr.replace(/[^\d.-]/g, ''));

    for (let i = 0; i < conditionalRules.length; i++) {
      const rule = conditionalRules[i];

      if (rule.metricLabel && rule.metricLabel !== metricLabel) continue;

      // Check scope
      if (rule.scope === 'data' && rowType !== 'data') continue;
      if (rule.scope === 'totals' && rowType === 'data') continue;

      let match = false;
      const ruleVal = typeof rule.value === 'number' ? rule.value : parseFloat(String(rule.value));

      switch (rule.operator) {
        case 'gt': match = !isNaN(numVal) && numVal > ruleVal; break;
        case 'lt': match = !isNaN(numVal) && numVal < ruleVal; break;
        case 'eq': match = numVal === ruleVal || valStr === String(rule.value); break;
        case 'between': match = !isNaN(numVal) && numVal >= ruleVal && numVal <= (rule.value2 || 0); break;
        case 'contains':
          // BOLT OPTIMIZATION: Avoid repeated String/toLowerCase on the cell value
          match = valLower.includes(String(rule.value).toLowerCase());
          break;
      }

      if (match) {
        const rs = rule.style;
        if (rs.backgroundColor) finalStyle.backgroundColor = rs.backgroundColor;
        if (rs.textColor) finalStyle.color = rs.textColor;
        if (rs.fontWeight) finalStyle.fontWeight = rs.fontWeight;
      }
    }
  }

  return finalStyle;
};
