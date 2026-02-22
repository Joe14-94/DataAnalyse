import { formatDateLabelForDisplay } from './common';
import { notify } from './notify';

/**
 * EXPORT UTILS
 * Supports PDF, HTML and PNG exports.
 * Uses dynamic imports for jsPDF and html2canvas to reduce initial bundle size.
 */

export const exportView = async (
  format: 'pdf' | 'html' | 'png',
  elementId: string,
  title: string,
  logo?: string,
  pdfMode: 'A4' | 'adaptive' = 'adaptive'
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    notify.error('Élément introuvable pour l\'export');
    return;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}`;

  if (format === 'pdf' || format === 'png') {
    try {
      // Dynamic imports
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf')
      ]);

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.top = '-10000px';
      clone.style.left = '0';
      clone.style.width = '1200px';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.zIndex = '-1';
      clone.style.background = 'white';

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1200
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdfWidthMM = 297;
      const margin = 10;
      const contentWidthMM = pdfWidthMM - (margin * 2);

      const ratio = contentWidthMM / imgWidth;
      const scaledHeightMM = imgHeight * ratio;

      let pdfHeightMM = 210;
      let orientation: 'p' | 'l' = 'l';

      if (pdfMode === 'adaptive') {
        pdfHeightMM = Math.max(210, scaledHeightMM + 40);
      } else {
        orientation = scaledHeightMM > 210 ? 'p' : 'l';
      }

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfMode === 'adaptive' ? [pdfWidthMM, pdfHeightMM] : 'a4'
      });

      const finalPdfWidth = pdf.internal.pageSize.getWidth();
      const finalPdfHeight = pdf.internal.pageSize.getHeight();

      let startY = 10;
      if (logo) {
        // Simple protocol validation
        const safeLogo = (logo.startsWith('data:image/') || logo.startsWith('blob:')) ? logo : undefined;
        if (safeLogo) {
            pdf.addImage(safeLogo, 'PNG', 10, 10, 25, 12);
            startY = 25;
        }
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, logo ? 40 : 10, 18);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Exporté le ${new Date().toLocaleDateString()}`, logo ? 40 : 10, 24);

      const renderWidth = finalPdfWidth - (margin * 2);
      const renderHeight = (imgHeight * renderWidth) / imgWidth;

      let finalRenderHeight = renderHeight;
      let finalRenderWidth = renderWidth;

      if (pdfMode === 'A4') {
        const availableHeight = finalPdfHeight - startY - margin;
        if (renderHeight > availableHeight) {
          const fitRatio = availableHeight / renderHeight;
          finalRenderHeight = availableHeight;
          finalRenderWidth = renderWidth * fitRatio;
        }
      }

      if (format === 'pdf') {
        pdf.addImage(imgData, 'PNG', margin, startY + 5, finalRenderWidth, finalRenderHeight);
        pdf.save(`${filename}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

    } catch (err) {
      console.error('Export Error', err);
      notify.error('Erreur lors de la génération de l\'export');
    }
  }

  else if (format === 'html') {
    try {
      const clone = element.cloneNode(true) as HTMLElement;

      const fixElement = (el: HTMLElement) => {
        el.style.maxHeight = 'none';
        el.style.height = 'auto';
        el.style.overflow = 'visible';

        Array.from(el.children).forEach(child => {
          if (child instanceof HTMLElement) {
            if (child.classList.contains('overflow-auto') ||
                child.classList.contains('overflow-hidden') ||
                child.classList.contains('overflow-y-auto') ||
                child.classList.contains('overflow-x-auto')) {
              child.style.overflow = 'visible';
              child.style.maxHeight = 'none';
              child.style.height = 'auto';
            }
            fixElement(child);
          }
        });
      };

      fixElement(clone);

      const safeLogo = (logo && (logo.startsWith('data:image/') || logo.startsWith('blob:'))) ? logo : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { padding: 2rem; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
            .export-container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
            .logo { height: 40px; width: auto; object-fit: contain; }
            .title h1 { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin: 0; }
            .title p { font-size: 0.875rem; color: #64748b; margin: 0; }
            * { max-height: none !important; overflow: visible !important; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 0.5rem; }
            th { background: #f8fafc; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="export-container">
            <div class="header">
              ${safeLogo ? `<img src="${safeLogo}" class="logo" alt="Logo" />` : ''}
              <div class="title">
                <h1>${title}</h1>
                <p>Exporté le ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div class="content">
              ${clone.innerHTML}
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (`${filename}.html`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);

    } catch (err) {
      console.error('HTML Export Error', err);
      notify.error('Erreur lors de l\'export HTML');
    }
  }
};

export const exportPivotToHTML = (
  pivotData: any,
  rowFields: string[],
  showTotalCol: boolean,
  title: string,
  logo?: string,
  options: {
    isTemporalMode?: boolean,
    temporalConfig?: any,
    temporalColTotals?: any,
    metrics?: any[],
    showVariations?: boolean,
    formatOutput?: (val: any, metric?: any) => string,
    fieldConfigs?: Record<string, any>
  } = {}
) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}`;

  const { isTemporalMode, temporalConfig, temporalColTotals, metrics, showVariations, formatOutput } = options;
  const activeMetrics = metrics && metrics.length > 0 ? metrics : [];

  try {
    let tableHTML = '<table id="interactive-pivot" class="pivot-table">';
    tableHTML += '<thead><tr>';

    if (isTemporalMode && temporalConfig) {
      rowFields.forEach(field => {
        tableHTML += `<th class="row-header sortable">${field}</th>`;
      });

      temporalConfig.sources.forEach((s: any) => {
        activeMetrics.forEach(m => {
          const mLabel = m.label || `${m.field} (${m.aggType})`;
          const displayLabel = activeMetrics.length > 1 ? `${s.label} - ${mLabel}` : s.label;
          tableHTML += `<th class="col-header sortable">${displayLabel}</th>`;
        });
        if (showVariations && s.id !== temporalConfig.referenceSourceId) {
          activeMetrics.forEach(m => {
             const mLabel = m.label || `${m.field} (${m.aggType})`;
             const displayLabel = activeMetrics.length > 1 ? `Δ ${s.label} - ${mLabel}` : `Δ ${s.label}`;
             tableHTML += `<th class="col-header sortable delta-header">${displayLabel}</th>`;
          });
        }
      });
      tableHTML += '</tr></thead><tbody>';

      (pivotData as any[]).forEach(result => {
        const rowClass = result.isSubtotal ? 'subtotal-row' : 'data-row';
        tableHTML += `<tr class="${rowClass}">`;

        const keys = result.groupLabel.split('\x1F');
        const subLevel = result.subtotalLevel || 0;

        rowFields.forEach((field, idx) => {
          const rawValue = keys[idx] || '';
          const label = options.fieldConfigs?.[field]?.type === 'date' ? formatDateLabelForDisplay(rawValue) : rawValue;
          if (result.isSubtotal) {
            if (idx === subLevel) tableHTML += `<td class="row-label">Total ${label}</td>`;
            else if (idx < subLevel) tableHTML += `<td class="row-label">${label}</td>`;
            else tableHTML += '<td class="row-label"></td>';
          } else {
            tableHTML += `<td class="row-label">${label}</td>`;
          }
        });

        temporalConfig.sources.forEach((s: any) => {
          activeMetrics.forEach(m => {
            const mLabel = m.label || `${m.field} (${m.aggType})`;
            const val = result.values[s.id]?.[mLabel] ?? 0;
            const display = formatOutput ? formatOutput(val, m) : val.toLocaleString();
            tableHTML += `<td class="metric-cell">${display}</td>`;
          });

          if (showVariations && s.id !== temporalConfig.referenceSourceId) {
            activeMetrics.forEach(m => {
               const mLabel = m.label || `${m.field} (${m.aggType})`;
               const delta = result.deltas[s.id]?.[mLabel];
               let display = '';
               let cls = 'delta-neutral';
               if (delta) {
                 if (temporalConfig.deltaFormat === 'percentage') {
                    display = delta.percentage !== 0 ? (delta.percentage > 0 ? '+' : '') + delta.percentage.toFixed(1) + '%' : '-';
                 } else {
                    display = delta.value !== 0 ? (delta.value > 0 ? '+' : '') + (formatOutput ? formatOutput(delta.value, m) : delta.value.toLocaleString()) : '-';
                 }
                 cls = delta.value > 0 ? 'delta-up' : delta.value < 0 ? 'delta-down' : 'delta-neutral';
               }
               tableHTML += `<td class="metric-cell ${cls}">${display}</td>`;
            });
          }
        });
        tableHTML += '</tr>';
      });

      if (temporalColTotals) {
        tableHTML += '<tr class="col-totals-row"><td class="total-label">TOTAL</td>';
        for (let i = 1; i < rowFields.length; i++) tableHTML += '<td></td>';

        temporalConfig.sources.forEach((s: any) => {
          activeMetrics.forEach(m => {
            const mLabel = m.label || `${m.field} (${m.aggType})`;
            const val = temporalColTotals[s.id]?.[mLabel] ?? 0;
            const display = formatOutput ? formatOutput(val, m) : val.toLocaleString();
            tableHTML += `<td class="total-cell">${display}</td>`;
          });
          if (showVariations && s.id !== temporalConfig.referenceSourceId) {
            activeMetrics.forEach(() => tableHTML += '<td></td>');
          }
        });
        tableHTML += '</tr>';
      }

    } else {
      rowFields.forEach(field => { tableHTML += `<th class="row-header sortable">${field}</th>`; });
      pivotData.colHeaders.forEach((header: string) => { tableHTML += `<th class="col-header sortable">${header}</th>`; });
      if (showTotalCol) tableHTML += '<th class="total-header sortable">Total</th>';
      tableHTML += '</tr></thead><tbody>';

      pivotData.displayRows.forEach((row: any) => {
        const rowClass = row.type === 'subtotal' ? 'subtotal-row' : row.type === 'grandTotal' ? 'grand-total-row' : 'data-row';
        tableHTML += `<tr class="${rowClass}">`;
        rowFields.forEach((field, index) => {
          if (index < row.keys.length) {
            const indent = row.type === 'subtotal' && index === row.keys.length - 1 ? '&nbsp;&nbsp;'.repeat(row.level || 0) : '';
            const rawValue = row.keys[index] || '';
            const label = options.fieldConfigs?.[field]?.type === 'date' ? formatDateLabelForDisplay(rawValue) : rawValue;
            tableHTML += `<td class="row-label">${indent}${label}</td>`;
          } else { tableHTML += '<td class="row-label"></td>'; }
        });
        pivotData.colHeaders.forEach((colHeader: string) => {
          const value = row.metrics[colHeader];
          const displayValue = value !== undefined && value !== null ? (formatOutput ? formatOutput(value) : value.toLocaleString()) : '';
          tableHTML += `<td class="metric-cell">${displayValue}</td>`;
        });
        if (showTotalCol) {
          const total = row.rowTotal;
          const displayTotal = total !== undefined && total !== null ? (formatOutput ? formatOutput(total) : total.toLocaleString()) : '';
          tableHTML += `<td class="total-cell">${displayTotal}</td>`;
        }
        tableHTML += '</tr>';
      });

      if (pivotData.colTotals) {
        tableHTML += '<tr class="col-totals-row"><td class="total-label">Total</td>';
        for (let i = 1; i < rowFields.length; i++) tableHTML += '<td></td>';
        pivotData.colHeaders.forEach((colHeader: string) => {
          const total = pivotData.colTotals[colHeader];
          tableHTML += `<td class="total-cell">${total !== undefined && total !== null ? (formatOutput ? formatOutput(total) : total.toLocaleString()) : ''}</td>`;
        });
        if (showTotalCol && pivotData.grandTotal !== undefined) {
          tableHTML += `<td class="grand-total-cell">${formatOutput ? formatOutput(pivotData.grandTotal) : pivotData.grandTotal.toLocaleString()}</td>`;
        }
        tableHTML += '</tr>';
      }
    }

    tableHTML += '</tbody></table>';

    const safeLogo = (logo && (logo.startsWith('data:image/') || logo.startsWith('blob:'))) ? logo : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          :root { --brand: #2563eb; --slate-50: #f8fafc; --slate-100: #f1f5f9; --slate-200: #e2e8f0; --slate-300: #cbd5e1; --slate-500: #64748b; --slate-600: #475569; --slate-700: #334155; --slate-800: #1e293b; }
          body { padding: 2rem; background: var(--slate-50); font-family: system-ui, -apple-system, sans-serif; color: var(--slate-800); margin: 0; }
          .export-container { max-width: 100%; margin: 0 auto; background: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); border: 1px solid var(--slate-200); }
          .header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; border-bottom: 2px solid var(--slate-100); padding-bottom: 1.5rem; }
          .logo { height: 48px; width: auto; object-fit: contain; }
          .title h1 { font-size: 1.75rem; font-weight: 800; color: var(--slate-800); margin: 0; letter-spacing: -0.025em; }
          .title p { font-size: 0.875rem; color: var(--slate-500); margin: 0.25rem 0 0; font-weight: 500; }

          .pivot-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 1rem; border: 1px solid var(--slate-200); border-radius: 0.5rem; overflow: hidden; table-layout: fixed; }
          .pivot-table th { background: var(--slate-100); border-bottom: 2px solid var(--slate-200); border-right: 1px solid var(--slate-200); padding: 0.75rem; font-weight: 700; text-align: left; font-size: 0.75rem; color: var(--slate-600); text-transform: uppercase; letter-spacing: 0.05em; position: relative; }
          .pivot-table .col-header, .pivot-table .total-header { text-align: right; }
          .pivot-table td { border-bottom: 1px solid var(--slate-100); border-right: 1px solid var(--slate-100); padding: 0.625rem 0.75rem; font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .pivot-table tr:last-child td { border-bottom: none; }
          .pivot-table .row-label { font-weight: 500; color: var(--slate-700); background: white; }
          .pivot-table .metric-cell, .pivot-table .total-cell, .pivot-table .grand-total-cell { text-align: right; font-variant-numeric: tabular-nums; }

          .pivot-table .subtotal-row { background: var(--slate-50); font-weight: 700; color: var(--slate-700); }
          .pivot-table .col-totals-row { background: var(--slate-100); font-weight: 800; border-top: 2px solid var(--slate-300); }
          .pivot-table .grand-total-row { background: #e0e7ff; font-weight: 800; }

          .sortable { cursor: pointer; transition: background 0.2s; }
          .sortable:hover { background: var(--slate-200); }
          .sortable::after { content: '↕'; margin-left: 0.5rem; opacity: 0.3; }

          .delta-up { color: #059669; font-weight: 700; background: #ecfdf5; }
          .delta-down { color: #dc2626; font-weight: 700; background: #fef2f2; }
          .delta-neutral { color: var(--slate-500); }

          .resizer { position: absolute; right: 0; top: 0; height: 100%; width: 5px; cursor: col-resize; user-select: none; }
          .resizer:hover { background: var(--brand); opacity: 0.5; }

          @media print {
            body { padding: 0; background: white; }
            .export-container { box-shadow: none; border: none; padding: 0; }
            .sortable::after { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="export-container">
          <div class="header">
            ${safeLogo ? `<img src="${safeLogo}" class="logo" alt="Logo" />` : ''}
            <div class="title">
              <h1>${title}</h1>
              <p>Rapport interactif • Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</p>
            </div>
          </div>
          <div style="overflow-x: auto; border-radius: 0.5rem;">
            ${tableHTML}
          </div>
        </div>

        <script>
          document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
              const table = th.closest('table');
              const tbody = table.querySelector('tbody');
              const rows = Array.from(tbody.querySelectorAll('tr.data-row'));
              const index = Array.from(th.parentNode.children).indexOf(th);
              const ascending = th.dataset.order !== 'asc';

              rows.sort((a, b) => {
                const aVal = a.children[index].innerText.replace(/[^0-9.-]/g, '');
                const bVal = b.children[index].innerText.replace(/[^0-9.-]/g, '');
                const aNum = parseFloat(aVal);
                const bNum = parseFloat(bVal);

                if (!isNaN(aNum) && !isNaN(bNum)) return ascending ? aNum - bNum : bNum - aNum;
                return ascending
                  ? a.children[index].innerText.localeCompare(b.children[index].innerText)
                  : b.children[index].innerText.localeCompare(a.children[index].innerText);
              });

              th.dataset.order = ascending ? 'asc' : 'desc';
              rows.forEach(row => tbody.appendChild(row));
              th.parentNode.querySelectorAll('.sortable').forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
              th.classList.add(ascending ? 'sorted-asc' : 'sorted-desc');
            });
          });

          document.querySelectorAll('th').forEach(th => {
            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            th.appendChild(resizer);

            let startX, startWidth;
            resizer.addEventListener('mousedown', e => {
              startX = e.pageX;
              startWidth = th.offsetWidth;
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            });

            function onMouseMove(e) {
              const width = startWidth + (e.pageX - startX);
              th.style.width = width + 'px';
            }

            function onMouseUp() {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            }
          });
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);

  } catch (err) {
    console.error('Pivot HTML Export Error', err);
    notify.error('Erreur lors de l\'export HTML du TCD');
  }
};
