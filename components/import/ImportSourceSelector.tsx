import React from 'react';
import { UploadCloud, Settings2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ImportSourceSelectorProps {
    date: string;
    setDate: (date: string) => void;
    fileEncoding: 'auto' | 'UTF-8' | 'windows-1252';
    setFileEncoding: (enc: 'auto' | 'UTF-8' | 'windows-1252') => void;
    isDragging: boolean;
    setIsDragging: (val: boolean) => void;
    isProcessingFile: boolean;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDrop: (e: React.DragEvent) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    text: string;
    setText: (text: string) => void;
    onAnalyzeText: () => void;
}

export const ImportSourceSelector: React.FC<ImportSourceSelectorProps> = ({
    date, setDate,
    fileEncoding, setFileEncoding,
    isDragging, setIsDragging,
    isProcessingFile,
    onFileSelect,
    onDrop,
    fileInputRef,
    text, setText,
    onAnalyzeText
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Date & DropZone */}
            <div className="space-y-6">
                <Card className="p-6">
                    <label htmlFor="import-date" className="block text-sm font-bold text-slate-700 mb-2">
                        1. Date de l'extraction
                    </label>
                    <input
                        type="date"
                        id="import-date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 p-2.5"
                        required
                    />
                </Card>

                <Card className="p-6 flex flex-col h-64 relative">
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-bold text-slate-700">
                            2. Fichier source
                        </label>

                        {/* ENCODING SELECTOR */}
                        <div className="flex items-center gap-2">
                            <Settings2 className="w-3 h-3 text-slate-400" />
                            <select
                                className="text-xs bg-slate-50 border border-slate-200 rounded py-0.5 px-1 text-slate-600 focus:ring-brand-500"
                                value={fileEncoding}
                                onChange={(e) => setFileEncoding(e.target.value as any)}
                                title="Forcer l'encodage si les accents sont incorrects"
                            >
                                <option value="auto">Auto-détection</option>
                                <option value="UTF-8">UTF-8</option>
                                <option value="windows-1252">Windows-1252 (Excel FR)</option>
                            </select>
                        </div>
                    </div>

                    <div
                        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                           ${isDragging ? 'border-brand-500 bg-brand-50 scale-[1.02]' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}
                        `}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isProcessingFile ? (
                            <div className="animate-pulse flex flex-col items-center">
                                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
                                <span className="text-brand-600 font-medium">Lecture du fichier...</span>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                                    <UploadCloud className="w-8 h-8 text-brand-600" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700">Cliquez ou glissez un fichier ici</h3>
                                <p className="text-xs text-slate-500 mt-1">Supporte .xlsx, .xls, .csv, .txt</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv,.txt"
                                    onChange={onFileSelect}
                                />
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Right: Copy Paste Fallback */}
            <Card className="p-6 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                    <label htmlFor="paste-area" className="block text-sm font-bold text-slate-700">
                        3. Ou coller le contenu (Legacy)
                    </label>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Texte brut</span>
                </div>
                <textarea
                    id="paste-area"
                    className="flex-1 w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-xs font-mono p-3 resize-none"
                    placeholder={`Alternative : Copiez ici les données de votre tableau Excel...\nHeader 1 \t Header 2\nVal 1 \t Val 2`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="flex justify-end pt-4">
                    <Button onClick={onAnalyzeText} disabled={!text.trim()}>
                        Analyser le texte
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </Card>
        </div>
    );
};
