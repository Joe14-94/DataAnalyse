
import React, { createContext, useContext, useCallback } from 'react';
import { PipelineModule, Pipeline } from '../types';
import { generateId } from '../utils';

interface PipelineContextType {
  pipelineModule: PipelineModule;
  addPipeline: (pipeline: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void;
  deletePipeline: (id: string) => void;
  duplicatePipeline: (id: string) => void;
}

export const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const PipelineProvider: React.FC<{
  pipelineModule: PipelineModule;
  onUpdate: (module: PipelineModule) => void;
  children: React.ReactNode;
}> = ({ pipelineModule, onUpdate, children }) => {

  const addPipeline = useCallback((pipeline: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = generateId();
    const now = Date.now();
    const newPipeline: Pipeline = {
      ...pipeline,
      id: newId,
      createdAt: now,
      updatedAt: now
    };
    onUpdate({
      ...pipelineModule,
      pipelines: [...pipelineModule.pipelines, newPipeline]
    });
    return newId;
  }, [pipelineModule, onUpdate]);

  const updatePipeline = useCallback((id: string, updates: Partial<Pipeline>) => {
    onUpdate({
      ...pipelineModule,
      pipelines: pipelineModule.pipelines.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      )
    });
  }, [pipelineModule, onUpdate]);

  const deletePipeline = useCallback((id: string) => {
    onUpdate({
      ...pipelineModule,
      pipelines: pipelineModule.pipelines.filter(p => p.id !== id)
    });
  }, [pipelineModule, onUpdate]);

  const duplicatePipeline = useCallback((id: string) => {
    const original = pipelineModule.pipelines.find(p => p.id === id);
    if (!original) return;

    const newId = generateId();
    const now = Date.now();
    const copy: Pipeline = {
      ...original,
      id: newId,
      name: `${original.name} (Copie)`,
      createdAt: now,
      updatedAt: now
    };
    onUpdate({
      ...pipelineModule,
      pipelines: [...pipelineModule.pipelines, copy]
    });
  }, [pipelineModule, onUpdate]);

  return (
    <PipelineContext.Provider value={{ pipelineModule, addPipeline, updatePipeline, deletePipeline, duplicatePipeline }}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};
