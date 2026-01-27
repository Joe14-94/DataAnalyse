
export const CHART_COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6'];

export const BORDER_COLORS = [
   { label: 'Gris', class: 'border-slate-200', bg: 'bg-slate-200' },
   { label: 'Bleu', class: 'border-blue-200', bg: 'bg-blue-200' },
   { label: 'Rouge', class: 'border-red-200', bg: 'bg-red-200' },
   { label: 'Vert', class: 'border-green-200', bg: 'bg-green-200' },
   { label: 'Orange', class: 'border-amber-200', bg: 'bg-amber-200' },
];

export const BORDER_WIDTHS = [
   { label: 'Aucune', value: '0' },
   { label: '1px', value: '1' },
   { label: '2px', value: '2' },
   { label: '4px', value: '4' },
];

export const SOURCE_COLORS = ['blue', 'indigo', 'purple', 'pink', 'teal', 'orange'];

export const SOURCE_COLOR_CLASSES: Record<string, { border: string, text: string, bg: string, hover: string }> = {
    blue: {
        border: 'border-blue-500',
        text: 'text-blue-700',
        bg: 'bg-blue-50',
        hover: 'hover:border-blue-400'
    },
    indigo: {
        border: 'border-indigo-500',
        text: 'text-indigo-700',
        bg: 'bg-indigo-50',
        hover: 'hover:border-indigo-400'
    },
    purple: {
        border: 'border-purple-500',
        text: 'text-purple-700',
        bg: 'bg-purple-50',
        hover: 'hover:border-purple-400'
    },
    pink: {
        border: 'border-pink-500',
        text: 'text-pink-700',
        bg: 'bg-pink-50',
        hover: 'hover:border-pink-400'
    },
    teal: {
        border: 'border-teal-500',
        text: 'text-teal-700',
        bg: 'bg-teal-50',
        hover: 'hover:border-teal-400'
    },
    orange: {
        border: 'border-orange-500',
        text: 'text-orange-700',
        bg: 'bg-orange-50',
        hover: 'hover:border-orange-400'
    }
};
