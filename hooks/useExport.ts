
import { useCallback } from 'react';

export const useExport = () => {
   const handleExportImage = useCallback(async (widgetId: string, title: string) => {
      const element = document.getElementById(`widget-container-${widgetId}`);
      if (!element) return;
      try {
         const html2canvas = (await import('html2canvas')).default;
         const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
         const url = canvas.toDataURL('image/png');
         const link = document.createElement('a');
         link.download = `widget_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
         link.href = url;
         link.click();
      } catch (e) {
         console.error("Export image failed", e);
      }
   }, []);

   const handleExportCSV = useCallback((data: any, title: string) => {
      if (!data) return;
      let csvContent = "";

      if (data.current && Array.isArray(data.current)) {
         // List Type
         csvContent = "Label;Valeur\n" + data.current.map((i: any) => `${i.name};${i.value}`).join("\n");
      } else if (data.data && Array.isArray(data.data)) {
         // Chart Type
         csvContent = "Label;Valeur\n" + data.data.map((i: any) => `${i.name};${i.value}`).join("\n");
      } else if (data.current !== undefined) {
         // KPI Type
         csvContent = `Indicateur;Valeur;Variation\n${title};${data.current};${data.trend || 0}%`;
      }

      if (csvContent) {
         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `widget_data_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
         document.body.appendChild(link);
         link.click();
         setTimeout(() => document.body.removeChild(link), 100);
      }
   }, []);

   return { handleExportImage, handleExportCSV };
};
