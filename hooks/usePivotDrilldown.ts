
import { useNavigate } from 'react-router-dom';

interface UsePivotDrilldownProps {
    rowFields: string[];
    colFields: string[];
    selectedBatchId: string;
    isSelectionMode: boolean;
}

export const usePivotDrilldown = ({
    rowFields, colFields, selectedBatchId, isSelectionMode
}: UsePivotDrilldownProps) => {
    const navigate = useNavigate();

    const handleDrilldown = (rowKeys: string[], colLabel: string) => {
        if (isSelectionMode) return;

        const prefilledFilters: Record<string, string> = {};

        rowFields.forEach((field, i) => {
            const val = rowKeys[i];
            if (val === '(Vide)') {
                prefilledFilters[field] = '__EMPTY__';
            } else {
                prefilledFilters[field] = `=${val}`;
            }
        });

        if (colFields.length > 0 && colLabel !== 'Total' && colLabel !== 'ALL') {
            const colValues = colLabel.split('\x1F');
            colFields.forEach((field, i) => {
                const val = colValues[i];
                if (val === undefined) return;
                if (val === '(Vide)') {
                    prefilledFilters[field] = '__EMPTY__';
                } else {
                    prefilledFilters[field] = `=${val}`;
                }
            });
        }

        if (selectedBatchId) {
            prefilledFilters['_batchId'] = selectedBatchId;
        }

        navigate('/data', { state: { prefilledFilters } });
    };

    return { handleDrilldown };
};
