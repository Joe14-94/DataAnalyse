import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

// --- Treemap Content ---
interface TreemapContentProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    index?: number;
    colors?: string[];
}

export const TreemapContent = (props: TreemapContentProps) => {
    const { x = 0, y = 0, width = 0, height = 0, name, index = 0, colors } = props;
    const fill = colors ? colors[index % colors.length] : '#64748b';
    const displayName = name || 'N/A';

    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />
            {width > 60 && height > 30 && (
                <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} dy={4} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    {displayName.substring(0, 12)}
                </text>
            )}
        </g>
    );
};
