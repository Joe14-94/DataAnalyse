import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode }> = ({
  defaultValue,
  children
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = e.currentTarget;
    const triggers = Array.from(list.querySelectorAll('[role="tab"]')) as HTMLElement[];
    const currentIndex = triggers.findIndex((t) => t === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % triggers.length;
    else if (e.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = triggers.length - 1;

    if (nextIndex !== -1) {
      e.preventDefault();
      triggers[nextIndex].focus();
      triggers[nextIndex].click();
    }
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={`flex gap-2 border-b border-slate-200 ${className}`}
    >
      {children}
    </div>
  );
};

export const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className = '' }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.activeTab === value;
  const id = `tab-${value.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <button
      id={id}
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value.toLowerCase().replace(/\s+/g, '-')}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => context.setActiveTab(value)}
      className={`px-4 py-2 text-sm font-bold transition-all rounded-t-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 outline-none ${
        isActive
          ? 'bg-brand-600 text-white shadow-md'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className = '' }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.activeTab !== value) return null;

  const id = `panel-${value.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div
      id={id}
      role="tabpanel"
      aria-labelledby={`tab-${value.toLowerCase().replace(/\s+/g, '-')}`}
      className={`mt-4 animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}
    >
      {children}
    </div>
  );
};
