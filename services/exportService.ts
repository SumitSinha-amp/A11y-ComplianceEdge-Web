
import { PageScanResult, AccessibilityIssue } from '../types';

declare const html2pdf: any;

export class ExportService {
  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);
  }

  static exportIssuesToCSV(issues: AccessibilityIssue[], filename: string) {
    const headers = ['Issue ID', 'Help', 'Impact', 'WCAG', 'Instances'];
    const rows = issues.map(i => [
      i.id,
      `"${i.help.replace(/"/g, '""')}"`,
      i.impact,
      i.wcag || 'N/A',
      i.nodes.length
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this.downloadFile(csvContent, `${filename.replace(/\s+/g, '_')}_A11y_Report.csv`, 'text/csv;charset=utf-8;');
  }

  static exportBatchToCSV(scans: PageScanResult[], filename: string) {
    const headers = ['Page', 'URL', 'Issue ID', 'Help', 'Impact', 'WCAG', 'Instances'];
    const rows: any[] = [];
    
    scans.forEach(scan => {
      scan.issues.forEach(i => {
        rows.push([
          `"${scan.title.replace(/"/g, '""')}"`,
          scan.path,
          i.id,
          `"${i.help.replace(/"/g, '""')}"`,
          i.impact,
          i.wcag || 'N/A',
          i.nodes.length
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this.downloadFile(csvContent, `${filename.replace(/\s+/g, '_')}_Batch_Report.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Generates a multi-page PDF using html2pdf.
   * This handles page breaks and CSS styling much better than manual canvas slicing.
   */
  static async generatePDF(element: HTMLElement, filename: string) {
    // Add a class to the element to help with print-specific styling
    const originalClass = element.className;
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    // Create export configuration
    const opt = {
      margin: [10, 10, 10, 10], // top, left, bottom, right in mm
      filename: `${filename.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#ffffff',
        // In the clone, force light mode if we are currently in dark mode
        onclone: (clonedDoc: Document) => {
          clonedDoc.documentElement.classList.remove('dark');
          clonedDoc.body.classList.remove('dark');
          clonedDoc.body.style.backgroundColor = '#ffffff';
          
          // Find the exported element in the clone
          // Since we might have multiple templates, we use the ref we just captured
          // But html2pdf handles the target isolation automatically.
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // Ensure element is visible during capture
      const originalOpacity = element.style.opacity;
      const originalPointer = element.style.pointerEvents;
      const originalZ = element.style.zIndex;
      
      element.style.opacity = '1';
      element.style.pointerEvents = 'auto';
      element.style.zIndex = '999999';

      // Wait a moment for layout to settle
      await new Promise(resolve => setTimeout(resolve, 800));

      await html2pdf().set(opt).from(element).save();
      
      // Restore styles
      element.style.opacity = originalOpacity;
      element.style.pointerEvents = originalPointer;
      element.style.zIndex = originalZ;
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('PDF Generation failed: ' + (error as Error).message);
    }
  }
}
