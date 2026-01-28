
import React from 'react';

interface TreemapContentProps {
   x: number;
   y: number;
   width: number;
   height: number;
   name: string;
   index: number;
   value?: number;
   colors: string[];
   fontSize?: number;
}

export const TreemapContent: React.FC<any> = (props) => {
   const { x, y, width, height, name, index, colors, fontSize = 10 } = props;

   // Si pas de dimensions valides, ne rien afficher
   if (!width || !height || width <= 0 || height <= 0) {
      return null;
   }

   const displayName = name || 'Sans nom';

   return (
      <g>
         <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={colors[index % colors.length]}
            stroke="#fff"
            strokeWidth={1}
         />
         {width > 35 && height > 20 && (
            <text
               x={x + width / 2}
               y={y + height / 2}
               textAnchor="middle"
               fill="#fff"
               fontSize={fontSize}
               fontWeight="normal"
               dy={4}
               style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
               {displayName.length > 12 ? displayName.substring(0, 10) + '...' : displayName}
            </text>
         )}
      </g>
   );
};
