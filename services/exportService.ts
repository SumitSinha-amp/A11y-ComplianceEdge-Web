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
   * Generates a professional multi-page PDF using html2pdf.
   * Leverages CSS break-inside: avoid for clean sectioning.
   */
  static async generatePDF(element: HTMLElement, filename: string) {
    // PDF Configuration
    const { default: html2pdf } = await import("html2pdf.js");
    const opt = {
      margin: 10,
      filename: `${filename.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          // Force pure light mode in the clone
          clonedDoc.documentElement.classList.remove('dark');
          clonedDoc.body.classList.remove('dark');
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.color = '#000000';
          
          // Fix potential scaling/overflow issues in the clone
          const target = clonedDoc.querySelector('.pdf-template-container') as HTMLElement;
          if (target) {
            target.style.width = '800px'; // Set exact width for capture
            target.style.margin = '0 auto';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: '.pdf-avoid-break' }
    };

    try {
      // Temporarily reveal if hidden (though absolute positioning handles this)
      const originalOpacity = element.style.opacity;
      element.style.opacity = '1';

      // Capture and save
      await html2pdf().set(opt).from(element).save();
      
      // Restore
      element.style.opacity = originalOpacity;
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Technical error during PDF generation. Please try again.');
    }
  }
}
