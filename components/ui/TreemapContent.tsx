
import React from 'react';

export const TreemapContent: React.FC<any> = (props) => {
   const { x, y, width, height, name, index, colors, fontSize = 10, depth = 0, fill, onClick, path } = props;

   // Si pas de dimensions valides, ne rien afficher
   if (!width || !height || width <= 0 || height <= 0) {
      return null;
   }

   const displayName = name || 'Sans nom';

   // Couleur: utiliser fill du node si disponible (mode hierarchique), sinon palette
   const rectFill = fill || colors[index % colors.length];

   // Style adapte a la profondeur
   const strokeWidth = depth === 0 ? 2 : 1;
   const textFontSize = depth === 0 ? Math.min(fontSize + 2, 14) : fontSize;
   const fontWeight = depth === 0 ? 'bold' : 'normal';

   const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick) {
         onClick(displayName, path);
      }
   };

   return (
      <g onClick={handleClick} style={onClick ? { cursor: 'pointer' } : undefined}>
         <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={rectFill}
            stroke="#fff"
            strokeWidth={strokeWidth}
         />
         {width > 35 && height > 20 && (
            <text
               x={x + width / 2}
               y={y + height / 2}
               textAnchor="middle"
               fill="#fff"
               fontSize={textFontSize}
               fontWeight={fontWeight}
               dy={4}
               style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)', pointerEvents: 'none' }}
            >
               {displayName.length > Math.floor(width / 7) ? displayName.substring(0, Math.floor(width / 7) - 1) + '...' : displayName}
            </text>
         )}
         {width > 55 && height > 35 && props.value !== undefined && (
            <text
               x={x + width / 2}
               y={y + height / 2 + textFontSize + 2}
               textAnchor="middle"
               fill="rgba(255,255,255,0.8)"
               fontSize={textFontSize - 2}
               fontWeight="normal"
               style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)', pointerEvents: 'none' }}
            >
               {typeof props.value === 'number' ? props.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : ''}
            </text>
         )}
      </g>
   );
};
