// pdfExporter.js - Utility functions for exporting session data to PDF and CSV

import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export session highlights to PDF
 */
export const exportHighlightsToPDF = (highlights, sessionInfo) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.setTextColor(139, 92, 246); // Purple color
  doc.text('Study Session Highlights', 20, 20);
  
  // Add session info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date: ${new Date(sessionInfo.startTime).toLocaleDateString()}`, 20, 30);
  doc.text(`Duration: ${sessionInfo.duration}`, 20, 36);
  doc.text(`Total Highlights: ${highlights.length}`, 20, 42);
  
  // Add highlights table
  const tableData = highlights.map((highlight, index) => [
    index + 1,
    `Page ${highlight.page}`,
    highlight.text.substring(0, 80) + (highlight.text.length > 80 ? '...' : ''),
    new Date(highlight.timestamp).toLocaleTimeString()
  ]);
  
  doc.autoTable({
    startY: 50,
    head: [['#', 'Page', 'Highlight', 'Time']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 25 },
      2: { cellWidth: 110 },
      3: { cellWidth: 30 }
    }
  });
  
  // Save the PDF
  const fileName = `highlights_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Export full session report to PDF
 */
export const exportSessionReportToPDF = (sessionData, summary, aiInsights) => {
  const doc = new jsPDF();
  let currentY = 20;
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(139, 92, 246);
  doc.text('Study Session Report', 20, currentY);
  currentY += 15;
  
  // Horizontal line
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(20, currentY, 190, currentY);
  currentY += 10;
  
  // Session Overview Section
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Session Overview', 20, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  const overviewData = [
    ['Start Time:', new Date(sessionData.startTime).toLocaleString()],
    ['End Time:', new Date(sessionData.endTime).toLocaleString()],
    ['Duration:', summary.duration],
    ['Engagement Score:', `${summary.engagementScore}%`],
    ['Presence:', `${summary.presencePercentage}%`],
    ['Good Posture:', `${summary.posturePercentage}%`]
  ];
  
  overviewData.forEach(([label, value]) => {
    doc.setTextColor(80);
    doc.text(label, 25, currentY);
    doc.setTextColor(0);
    doc.text(value, 80, currentY);
    currentY += 6;
  });
  currentY += 5;
  
  // Statistics Section
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Study Statistics', 20, currentY);
  currentY += 10;
  
  const statsData = [
    ['Total Pages Viewed', summary.totalPages],
    ['Total Highlights', summary.totalHighlights],
    ['Average Time per Page', `${summary.averageTimePerPage}s`],
    ['Blink Rate', `${summary.blinkRate}/min`],
    ['Most Visited Page', summary.mostVisitedPage || 'N/A']
  ];
  
  doc.autoTable({
    startY: currentY,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'plain',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 80 }
    }
  });
  
  currentY = doc.lastAutoTable.finalY + 15;
  
  // Highlights Section (if any)
  if (sessionData.highlights && sessionData.highlights.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Study Highlights', 20, currentY);
    currentY += 10;
    
    const highlightData = sessionData.highlights.slice(0, 10).map((h, i) => [
      i + 1,
      `Page ${h.page}`,
      h.text.substring(0, 70) + (h.text.length > 70 ? '...' : '')
    ]);
    
    doc.autoTable({
      startY: currentY,
      head: [['#', 'Page', 'Highlighted Text']],
      body: highlightData,
      theme: 'striped',
      headStyles: {
        fillColor: [139, 92, 246],
        textColor: 255
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 25 },
        2: { cellWidth: 140 }
      }
    });
    
    currentY = doc.lastAutoTable.finalY + 10;
    
    if (sessionData.highlights.length > 10) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`... and ${sessionData.highlights.length - 10} more highlights`, 20, currentY);
      currentY += 10;
    }
  }
  
  // AI Insights Section (if available)
  if (aiInsights) {
    doc.addPage();
    currentY = 20;
    
    doc.setFontSize(16);
    doc.setTextColor(139, 92, 246);
    doc.text('AI-Generated Insights', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Split insights into lines
    const lines = doc.splitTextToSize(aiInsights, 170);
    lines.forEach(line => {
      if (currentY > 280) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, 20, currentY);
      currentY += 6;
    });
  }
  
  // Footer on last page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated by studyguardian | ${new Date().toLocaleDateString()}`,
      20,
      290
    );
  }
  
  // Save
  const fileName = `session_report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Export highlights to CSV
 */
export const exportHighlightsToCSV = (highlights, sessionInfo) => {
  // Create CSV header
  let csv = 'Number,Page,Highlighted Text,Timestamp\n';
  
  // Add data rows
  highlights.forEach((highlight, index) => {
    const text = highlight.text.replace(/"/g, '""'); // Escape quotes
    const timestamp = new Date(highlight.timestamp).toLocaleString();
    csv += `${index + 1},"Page ${highlight.page}","${text}","${timestamp}"\n`;
  });
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `highlights_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export session data to CSV
 */
export const exportSessionDataToCSV = (sessionData, summary) => {
  let csv = 'Metric,Value\n';
  
  // Add overview data
  csv += `Start Time,${new Date(sessionData.startTime).toLocaleString()}\n`;
  csv += `End Time,${new Date(sessionData.endTime).toLocaleString()}\n`;
  csv += `Duration,${summary.duration}\n`;
  csv += `Engagement Score,${summary.engagementScore}%\n`;
  csv += `Presence Percentage,${summary.presencePercentage}%\n`;
  csv += `Good Posture Percentage,${summary.posturePercentage}%\n`;
  csv += `Total Pages,${summary.totalPages}\n`;
  csv += `Total Highlights,${summary.totalHighlights}\n`;
  csv += `Average Time per Page,${summary.averageTimePerPage}s\n`;
  csv += `Blink Rate,${summary.blinkRate}/min\n`;
  csv += `Most Visited Page,${summary.mostVisitedPage || 'N/A'}\n`;
  
  // Add page visit data
  if (sessionData.pageVisits) {
    csv += '\n\nPage Activity\n';
    csv += 'Page Number,Visit Count,Total Time (seconds)\n';
    Object.entries(sessionData.pageVisits).forEach(([page, count]) => {
      const time = sessionData.totalTimeOnPage?.[page] || 0;
      csv += `${page},${count},${time}\n`;
    });
  }
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `session_data_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export teacher's room report to PDF
 */
export const exportRoomReportToPDF = (roomData, studentsData, metricsData) => {
  const doc = new jsPDF();
  let currentY = 20;
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(139, 92, 246);
  doc.text(`Room Report: ${roomData.title}`, 20, currentY);
  currentY += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Code: ${roomData.code} | Generated: ${new Date().toLocaleString()}`, 20, currentY);
  currentY += 15;
  
  // Room Overview
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Room Overview', 20, currentY);
  currentY += 10;
  
  const roomStats = [
    ['Total Students', studentsData.length],
    ['Active Sessions', metricsData.activeSessions || 0],
    ['Total PDFs', roomData.pdfs?.length || 0],
    ['Average Engagement', `${metricsData.avgEngagement || 0}%`]
  ];
  
  doc.autoTable({
    startY: currentY,
    head: [['Metric', 'Value']],
    body: roomStats,
    theme: 'plain',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255
    }
  });
  
  currentY = doc.lastAutoTable.finalY + 15;
  
  // Student Performance
  if (studentsData.length > 0) {
    doc.setFontSize(16);
    doc.text('Student Performance', 20, currentY);
    currentY += 10;
    
    const studentData = studentsData.map(student => {
      const metrics = metricsData.students?.[student._id] || {};
      return [
        student.name,
        metrics.presence || 'N/A',
        metrics.engagement || 'N/A',
        metrics.highlightCount || 0,
        metrics.sessionCount || 0
      ];
    });
    
    doc.autoTable({
      startY: currentY,
      head: [['Student Name', 'Presence', 'Engagement', 'Highlights', 'Sessions']],
      body: studentData,
      theme: 'striped',
      headStyles: {
        fillColor: [139, 92, 246],
        textColor: 255
      },
      styles: { fontSize: 9 }
    });
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | studyguardian Teacher Report`,
      20,
      290
    );
  }
  
  // Save
  const fileName = `room_report_${roomData.code}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Export analytics data to CSV
 */
export const exportAnalyticsToCSV = (analyticsData) => {
  let csv = 'Date,Metric,Value\n';
  
  // Add analytics data
  Object.entries(analyticsData).forEach(([date, metrics]) => {
    Object.entries(metrics).forEach(([metric, value]) => {
      csv += `${date},${metric},${value}\n`;
    });
  });
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export routine progress to PDF
 */
export const exportRoutineProgressToPDF = (routine, progressData) => {
  const doc = new jsPDF();
  let currentY = 20;
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(16, 185, 129); // Green color
  doc.text(`Study Routine: ${routine.title}`, 20, currentY);
  currentY += 15;
  
  // Routine Info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Type: ${routine.type}`, 20, currentY);
  currentY += 6;
  doc.text(`Period: ${new Date(routine.startDate).toLocaleDateString()} - ${new Date(routine.endDate).toLocaleDateString()}`, 20, currentY);
  currentY += 15;
  
  // Subject Progress
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Subject Progress', 20, currentY);
  currentY += 10;
  
  const subjectData = routine.subjects.map(subject => {
    const completed = subject.hoursCompleted || 0;
    const target = subject.targetHours;
    const percentage = Math.round((completed / target) * 100);
    return [
      subject.name,
      `${completed}h`,
      `${target}h`,
      `${percentage}%`,
      percentage >= 100 ? 'Completed' : percentage >= 75 ? 'On Track' : 'Behind'
    ];
  });
  
  doc.autoTable({
    startY: currentY,
    head: [['Subject', 'Completed', 'Target', 'Progress', 'Status']],
    body: subjectData,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255
    },
    styles: { fontSize: 10 }
  });
  
  currentY = doc.lastAutoTable.finalY + 15;
  
  // Study Schedule
  if (routine.studyTimeSlots && routine.studyTimeSlots.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(16);
    doc.text('Study Schedule', 20, currentY);
    currentY += 10;
    
    const scheduleData = routine.studyTimeSlots.map(slot => [
      slot.day,
      slot.startTime,
      slot.endTime,
      calculateDuration(slot.startTime, slot.endTime)
    ]);
    
    doc.autoTable({
      startY: currentY,
      head: [['Day', 'Start Time', 'End Time', 'Duration']],
      body: scheduleData,
      theme: 'plain',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255
      }
    });
  }
  
  // Progress Summary
  doc.addPage();
  currentY = 20;
  
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Progress Summary', 20, currentY);
  currentY += 10;
  
  const totalTarget = routine.subjects.reduce((sum, s) => sum + s.targetHours, 0);
  const totalCompleted = routine.subjects.reduce((sum, s) => sum + (s.hoursCompleted || 0), 0);
  const overallProgress = Math.round((totalCompleted / totalTarget) * 100);
  
  doc.setFontSize(12);
  doc.text(`Overall Progress: ${overallProgress}%`, 20, currentY);
  currentY += 10;
  
  // Progress bar visualization
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.rect(20, currentY, 170, 10);
  
  doc.setFillColor(16, 185, 129);
  doc.rect(20, currentY, (170 * overallProgress) / 100, 10, 'F');
  
  currentY += 20;
  
  doc.setFontSize(10);
  doc.text(`Total Hours Completed: ${totalCompleted}h / ${totalTarget}h`, 20, currentY);
  
  // Save
  const fileName = `routine_progress_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Helper function to calculate duration between times
 */
const calculateDuration = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const durationMinutes = endMinutes - startMinutes;
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  return `${hours}h ${minutes}m`;
};

/**
 * Generate quick summary text
 */
export const generateSummaryText = (sessionData, summary) => {
  const text = `
Study Session Summary
Generated: ${new Date().toLocaleString()}

SESSION OVERVIEW
Start Time: ${new Date(sessionData.startTime).toLocaleString()}
End Time: ${new Date(sessionData.endTime).toLocaleString()}
Duration: ${summary.duration}

PERFORMANCE METRICS
Engagement Score: ${summary.engagementScore}%
Presence: ${summary.presencePercentage}%
Good Posture: ${summary.posturePercentage}%
Blink Rate: ${summary.blinkRate}/min

STUDY ACTIVITY
Total Pages Viewed: ${summary.totalPages}
Total Highlights: ${summary.totalHighlights}
Average Time per Page: ${summary.averageTimePerPage}s
Most Visited Page: ${summary.mostVisitedPage || 'N/A'}

HIGHLIGHTS
${sessionData.highlights.slice(0, 5).map((h, i) => 
  `${i + 1}. [Page ${h.page}] ${h.text.substring(0, 80)}...`
).join('\n')}
${sessionData.highlights.length > 5 ? `\n... and ${sessionData.highlights.length - 5} more highlights` : ''}
`;
  
  return text;
};

/**
 * Copy summary to clipboard
 */
export const copySummaryToClipboard = (sessionData, summary) => {
  const text = generateSummaryText(sessionData, summary);
  
  navigator.clipboard.writeText(text).then(() => {
    return true;
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    return false;
  });
};

/**
 * Download summary as text file
 */
export const downloadSummaryAsText = (sessionData, summary) => {
  const text = generateSummaryText(sessionData, summary);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `session_summary_${new Date().toISOString().split('T')[0]}.txt`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Create shareable report link (mock function - would need backend implementation)
 */
export const createShareableLink = async (sessionData, apiUrl, token) => {
  try {
    const response = await fetch(`${apiUrl}/api/interactions/create-share-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionData })
    });
    
    const data = await response.json();
    return data.shareLink;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
};

/**
 * Print report
 */
export const printReport = (sessionData, summary, aiInsights) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Study Session Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
        }
        h1 {
          color: #8B5CF6;
          border-bottom: 3px solid #8B5CF6;
          padding-bottom: 10px;
        }
        h2 {
          color: #5B21B6;
          margin-top: 30px;
        }
        .metric {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          border-bottom: 1px solid #E5E7EB;
        }
        .metric-label {
          font-weight: 600;
          color: #6B7280;
        }
        .metric-value {
          color: #111827;
        }
        .highlight-item {
          margin: 10px 0;
          padding: 10px;
          background: #F3F4F6;
          border-left: 4px solid #8B5CF6;
        }
        .insights {
          background: #EDE9FE;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Study Session Report</h1>
      
      <h2>Session Overview</h2>
      <div class="metric">
        <span class="metric-label">Start Time:</span>
        <span class="metric-value">${new Date(sessionData.startTime).toLocaleString()}</span>
      </div>
      <div class="metric">
        <span class="metric-label">End Time:</span>
        <span class="metric-value">${new Date(sessionData.endTime).toLocaleString()}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Duration:</span>
        <span class="metric-value">${summary.duration}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Engagement Score:</span>
        <span class="metric-value">${summary.engagementScore}%</span>
      </div>
      
      <h2>Performance Metrics</h2>
      <div class="metric">
        <span class="metric-label">Presence:</span>
        <span class="metric-value">${summary.presencePercentage}%</span>
      </div>
      <div class="metric">
        <span class="metric-label">Good Posture:</span>
        <span class="metric-value">${summary.posturePercentage}%</span>
      </div>
      <div class="metric">
        <span class="metric-label">Blink Rate:</span>
        <span class="metric-value">${summary.blinkRate}/min</span>
      </div>
      
      <h2>Study Activity</h2>
      <div class="metric">
        <span class="metric-label">Total Pages:</span>
        <span class="metric-value">${summary.totalPages}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Total Highlights:</span>
        <span class="metric-value">${summary.totalHighlights}</span>
      </div>
      
      ${sessionData.highlights && sessionData.highlights.length > 0 ? `
        <h2>Highlights</h2>
        ${sessionData.highlights.slice(0, 10).map((h, i) => `
          <div class="highlight-item">
            <strong>${i + 1}. Page ${h.page}</strong><br/>
            ${h.text}
          </div>
        `).join('')}
      ` : ''}
      
      ${aiInsights ? `
        <h2>AI-Generated Insights</h2>
        <div class="insights">
          ${aiInsights.replace(/\n/g, '<br/>')}
        </div>
      ` : ''}
      
      <div style="margin-top: 40px; text-align: center; color: #9CA3AF; font-size: 12px;">
        Generated by studyguardian | ${new Date().toLocaleDateString()}
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export default {
  exportHighlightsToPDF,
  exportSessionReportToPDF,
  exportHighlightsToCSV,
  exportSessionDataToCSV,
  exportRoomReportToPDF,
  exportAnalyticsToCSV,
  exportRoutineProgressToPDF,
  generateSummaryText,
  copySummaryToClipboard,
  downloadSummaryAsText,
  createShareableLink,
  printReport
};