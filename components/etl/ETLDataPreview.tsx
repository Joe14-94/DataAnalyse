import React from 'react';
import { DataRow } from '../../types';

interface ETLDataPreviewProps {
    data: DataRow[];
}

export const ETLDataPreview: React.FC<ETLDataPreviewProps> = ({ data }) => {
    if (data.length === 0) {
        return <p className="text-sm text-slate-500">Aucune donnée</p>;
    }

    const columns = Object.keys(data[0]);

    return (
        <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {columns.map(col => (
                            <th key={col} className="text-left p-2 font-bold text-slate-700">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            {columns.map(col => (
                                <td key={col} className="p-2 text-slate-800">
                                    {String(row[col] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
