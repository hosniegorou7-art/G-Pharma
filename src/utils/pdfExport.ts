import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportSectionToPDF(sectionId: string, fileName: string) {
  const input = document.getElementById(sectionId);
  if (!input) {
    alert('Section à exporter non trouvée.');
    return;
  }
  const canvas = await html2canvas(input);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const imgX = (pageWidth - imgWidth * ratio) / 2;
  const imgY = 20;
  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
  pdf.save(fileName);
}
