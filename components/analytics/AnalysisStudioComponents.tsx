import React from 'react';

// --- Treemap Content ---
export const TreemapContent = (props: any) => {
    const { x, y, width, height, name, index, colors } = props;
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

