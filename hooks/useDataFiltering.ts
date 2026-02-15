import { useReducer, useCallback } from 'react';

export interface FilterState {
    searchTerm: string;
    columnFilters: Record<string, string>;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    showFilters: boolean;
}

type FilterAction =
    | { type: 'SET_SEARCH_TERM'; payload: string }
    | { type: 'SET_COLUMN_FILTERS'; payload: Record<string, string> }
    | { type: 'UPDATE_COLUMN_FILTER'; payload: { key: string; value: string } }
    | { type: 'SET_SORT_CONFIG'; payload: { key: string; direction: 'asc' | 'desc' } | null }
    | { type: 'SET_SHOW_FILTERS'; payload: boolean };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
    switch (action.type) {
        case 'SET_SEARCH_TERM': return { ...state, searchTerm: action.payload };
        case 'SET_COLUMN_FILTERS': return { ...state, columnFilters: action.payload };
        case 'UPDATE_COLUMN_FILTER': return { ...state, columnFilters: { ...state.columnFilters, [action.payload.key]: action.payload.value } };
        case 'SET_SORT_CONFIG': return { ...state, sortConfig: action.payload };
        case 'SET_SHOW_FILTERS': return { ...state, showFilters: action.payload };
        default: return state;
    }
}

export function useDataFiltering() {
    const [state, dispatch] = useReducer(filterReducer, {
        searchTerm: '',
        columnFilters: {},
        sortConfig: null,
        showFilters: false
    });

    const handleSort = useCallback((key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (state.sortConfig && state.sortConfig.key === key && state.sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        dispatch({ type: 'SET_SORT_CONFIG', payload: { key, direction } });
    }, [state.sortConfig]);

    const clearFilters = useCallback(() => {
        dispatch({ type: 'SET_COLUMN_FILTERS', payload: {} });
        dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
        dispatch({ type: 'SET_SORT_CONFIG', payload: null });
    }, []);

    return {
        ...state,
        dispatch,
        handleSort,
        clearFilters
    };
}
