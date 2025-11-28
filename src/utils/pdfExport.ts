import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Session, Territory, LocationPoint } from '../types';
import { calculateSessionStats } from './statistics';

interface ExportData {
  session: Session;
  locations: LocationPoint[];
  territory: Territory | null;
  mapElement: HTMLElement;
}

export async function generateSessionPDF(data: ExportData): Promise<void> {
  const { session, locations, territory, mapElement } = data;

  // Calculate stats
  const stats = calculateSessionStats(
    locations,
    session.startTime?.toDate() || new Date(),
    session.endTime?.toDate() || null
  );

  // Create PDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(16, 185, 129); // Green color
  pdf.text('Prizma Tracker - Izvještaj Sesije', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Session info
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Radnik: ${session.workerName}`, 20, yPosition);
  yPosition += 7;
  
  const startDate = session.startTime?.toDate?.()?.toLocaleString('hr-HR') || 'N/A';
  pdf.text(`Datum: ${startDate}`, 20, yPosition);
  yPosition += 7;

  if (territory) {
    pdf.text(`Teren: ${territory.name}`, 20, yPosition);
    yPosition += 7;
  }

  pdf.text(`Status: ${session.status === 'active' ? 'Aktivan' : 'Završen'}`, 20, yPosition);
  yPosition += 15;

  // Statistics section
  pdf.setFontSize(14);
  pdf.setTextColor(16, 185, 129);
  pdf.text('Statistika', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);

  const statsData = [
    ['Udaljenost:', `${stats.totalDistanceKm.toFixed(2)} km`],
    ['Trajanje:', stats.durationFormatted],
    ['Prosječna brzina:', `${stats.averageSpeedKmh.toFixed(1)} km/h`],
    ['Maksimalna brzina:', `${stats.maxSpeedKmh.toFixed(1)} km/h`],
    ['GPS točaka:', `${locations.length}`],
  ];

  if (session.flyerCount) {
    statsData.push(['Odabir letaka:', `${session.flyerCount}`]);
  }

  statsData.forEach(([label, value]) => {
    pdf.text(label, 20, yPosition);
    pdf.text(value, 80, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Map screenshot
  try {
    pdf.setFontSize(14);
    pdf.setTextColor(16, 185, 129);
    pdf.text('Mapa rute', 20, yPosition);
    yPosition += 10;

    const canvas = await html2canvas(mapElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if image fits on current page
    if (yPosition + imgHeight > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
  } catch (error) {
    console.error('Error capturing map:', error);
    pdf.text('Greška pri generiranju mape', 20, yPosition);
  }

  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Generirano: ${new Date().toLocaleString('hr-HR')}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Save PDF
  const filename = `prizma-sesija-${session.workerName.replace(/\s+/g, '-')}-${
    session.startTime?.toDate?.()?.toLocaleDateString('hr-HR').replace(/\./g, '-') || 'unknown'
  }.pdf`;
  
  pdf.save(filename);
}