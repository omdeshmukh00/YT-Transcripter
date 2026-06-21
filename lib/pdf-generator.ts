import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

/**
 * Client-side PDF compiler that sequentially renders each page element in the template container
 * using html2canvas at high resolution, and outputs a combined PDF blob.
 */
export async function generatePdfClient(containerId: string): Promise<Blob> {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error('PDF template container not found');
  }

  // Find all individual A4 page elements rendered inside the template container
  const pageElements = container.querySelectorAll('.pdf-page-element');
  if (pageElements.length === 0) {
    throw new Error('No PDF page elements found to compile.');
  }

  // Wait for all images inside the container to be fully loaded before generating canvas
  const images = container.querySelectorAll('img');
  const imageLoadPromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  await Promise.all(imageLoadPromises);

  // Standard A4 dimensions in Points (pt)
  // 595.27 x 841.89 pt matches the standard A4 ratio
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i] as HTMLElement;

    // Ensure all custom fonts (especially Devanagari fonts like Mukta) are loaded before capturing
    if (typeof window !== 'undefined' && 'fonts' in document) {
      await document.fonts.ready;
    }

    // Compile page element to canvas
    // scale: 4.0 produces ultra-high-resolution sharp visuals (looks sharp even under high zoom)
    const canvas = await html2canvas(pageEl, {
      scale: 4.0,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 595.27, // Lock virtual viewport width during capture
      windowHeight: 841.89, // Lock virtual viewport height during capture
    });

    // Compress canvas to JPEG for PDF size optimization (quality 0.88 keeps download sizes and details balanced)
    const imgData = canvas.toDataURL('image/jpeg', 0.88);

    if (i > 0) {
      doc.addPage();
    }

    doc.addImage(imgData, 'JPEG', 0, 0, 595.27, 841.89, undefined, 'FAST');

    // Add native PDF link annotations if any exist in the page HTML
    const pageRect = pageEl.getBoundingClientRect();
    const links = pageEl.querySelectorAll('a');
    links.forEach((link) => {
      const linkRect = link.getBoundingClientRect();
      const scaleX = 595.27 / pageRect.width;
      const scaleY = 841.89 / pageRect.height;
      const x = (linkRect.left - pageRect.left) * scaleX;
      const y = (linkRect.top - pageRect.top) * scaleY;
      const w = linkRect.width * scaleX;
      const h = linkRect.height * scaleY;
      const url = link.getAttribute('href');
      if (url) {
        doc.link(x, y, w, h, { url });
      }
    });
  }

  return doc.output('blob');
}
