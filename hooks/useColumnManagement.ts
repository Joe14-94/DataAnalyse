import { useReducer, useCallback, useEffect } from 'react';
import { DataRow, CalculatedField, FieldConfig } from '../types';

export interface ColumnState {
    columnWidths: Record<string, number>;
    resizingColumn: string | null;
    resizeStartX: number;
    resizeStartWidth: number;
    selectedCol: string | null;
    renamingValue: string;
    showColumnBorders: boolean;
}

type ColumnAction =
    | { type: 'SET_COLUMN_WIDTHS'; payload: Record<string, number> }
    | { type: 'UPDATE_COLUMN_WIDTH'; payload: { key: string; width: number } }
    | { type: 'SET_RESIZING_COLUMN'; payload: string | null }
    | { type: 'SET_RESIZE_START'; payload: { x: number; width: number } }
    | { type: 'SET_SELECTED_COL'; payload: string | null }
    | { type: 'SET_RENAMING_VALUE'; payload: string }
    | { type: 'SET_SHOW_BORDERS'; payload: boolean };

function columnReducer(state: ColumnState, action: ColumnAction): ColumnState {
    switch (action.type) {
        case 'SET_COLUMN_WIDTHS': return { ...state, columnWidths: action.payload };
        case 'UPDATE_COLUMN_WIDTH': return { ...state, columnWidths: { ...state.columnWidths, [action.payload.key]: action.payload.width } };
        case 'SET_RESIZING_COLUMN': return { ...state, resizingColumn: action.payload };
        case 'SET_RESIZE_START': return { ...state, resizeStartX: action.payload.x, resizeStartWidth: action.payload.width };
        case 'SET_SELECTED_COL': return { ...state, selectedCol: action.payload };
        case 'SET_RENAMING_VALUE': return { ...state, renamingValue: action.payload };
        case 'SET_SHOW_BORDERS': return { ...state, showColumnBorders: action.payload };
        default: return state;
    }
}

export function useColumnManagement(initialWidths: Record<string, number> = {}, initialBorders: boolean = true) {
    const [state, dispatch] = useReducer(columnReducer, {
        columnWidths: initialWidths,
        resizingColumn: null,
        resizeStartX: 0,
        resizeStartWidth: 0,
        selectedCol: null,
        renamingValue: '',
        showColumnBorders: initialBorders
    });

    const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string, currentWidth: number) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'SET_RESIZING_COLUMN', payload: columnKey });
        dispatch({ type: 'SET_RESIZE_START', payload: { x: e.clientX, width: currentWidth } });
    }, []);

    useEffect(() => {
        if (!state.resizingColumn) return;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - state.resizeStartX;
            const newWidth = Math.max(80, state.resizeStartWidth + diff);
            dispatch({ type: 'UPDATE_COLUMN_WIDTH', payload: { key: state.resizingColumn!, width: newWidth } });
        };

        const handleMouseUp = () => {
            dispatch({ type: 'SET_RESIZING_COLUMN', payload: null });
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [state.resizingColumn, state.resizeStartX, state.resizeStartWidth]);

    return {
        ...state,
        dispatch,
        handleResizeStart
    };
}
