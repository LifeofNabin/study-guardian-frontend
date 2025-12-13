import jsPDF from 'jspdf';
import Papa from 'papaparse';

/**
 * Export utilities for highlights, annotations, and session data
 */

/**
 * Export highlights to PDF
 * @param {Array} highlights - Array of highlight objects
 * @param {Object} options - Export options
 */
export const exportHighlightsToPDF = (highlights, options = {}) => {
  try {
    const {
      title = 'Study Highlights',
      includeMaterial = true,
      includeNotes = true,
      groupBy = 'page', // 'page', 'category', 'color'
      materialTitle = 'Study Material'
    } = options;

    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    // Helper function to add new page if needed
    const checkAddPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Helper function to wrap text
    const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line, index) => {
        if (index > 0) checkAddPage();
        doc.text(line, x, y + (index * lineHeight));
      });
      return lines.length * lineHeight;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPosition);
    yPosition += 15;

    // Material title
    if (includeMaterial && materialTitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.text(`Material: ${materialTitle}`, margin, yPosition);
      yPosition += 10;
    }

    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Highlights: ${highlights.length}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 12;

    // Draw line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Group highlights
    let groupedHighlights = {};
    
    if (groupBy === 'page') {
      highlights.forEach(h => {
        const key = `Page ${h.page_number}`;
        if (!groupedHighlights[key]) groupedHighlights[key] = [];
        groupedHighlights[key].push(h);
      });
    } else if (groupBy === 'category') {
      highlights.forEach(h => {
        const key = h.category || 'Uncategorized';
        if (!groupedHighlights[key]) groupedHighlights[key] = [];
        groupedHighlights[key].push(h);
      });
    } else if (groupBy === 'color') {
      highlights.forEach(h => {
        const key = h.color || '#FFFF00';
        if (!groupedHighlights[key]) groupedHighlights[key] = [];
        groupedHighlights[key].push(h);
      });
    }

    // Render grouped highlights
    Object.keys(groupedHighlights).sort().forEach((group, groupIndex) => {
      checkAddPage(30);

      // Group header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(group, margin, yPosition);
      yPosition += 10;

      groupedHighlights[group].forEach((highlight, index) => {
        checkAddPage(40);

        // Highlight number
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}.`, margin, yPosition);

        // Color indicator (small rectangle)
        if (highlight.color) {
          const rgb = hexToRgb(highlight.color);
          if (rgb) {
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            doc.rect(margin + 10, yPosition - 3, 5, 5, 'F');
          }
        }

        // Highlight text
        doc.setFont('helvetica', 'normal');
        const textHeight = addWrappedText(
          highlight.text,
          margin + 20,
          yPosition,
          maxWidth - 20,
          10
        );
        yPosition += textHeight + 2;

        // Category and page info
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        let info = [];
        if (groupBy !== 'page') info.push(`Page ${highlight.page_number}`);
        if (groupBy !== 'category' && highlight.category) info.push(highlight.category);
        if (highlight.createdAt) {
          info.push(new Date(highlight.createdAt).toLocaleDateString());
        }
        doc.text(info.join(' | '), margin + 20, yPosition);
        yPosition += 7;

        // Notes
        if (includeNotes && highlight.notes) {
          checkAddPage(20);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          const notesHeight = addWrappedText(
            `Note: ${highlight.notes}`,
            margin + 20,
            yPosition,
            maxWidth - 20,
            9
          );
          yPosition += notesHeight + 5;
        }

        yPosition += 5; // Space between highlights
      });

      yPosition += 5; // Extra space between groups
    });

    // Footer on last page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    const filename = `highlights_${Date.now()}.pdf`;
    doc.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('Error exporting highlights to PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export highlights to CSV
 * @param {Array} highlights - Array of highlight objects
 * @param {Object} options - Export options
 */
export const exportHighlightsToCSV = (highlights, options = {}) => {
  try {
    const {
      includeNotes = true,
      includeTags = true,
      materialTitle = 'Study Material'
    } = options;

    // Prepare data
    const data = highlights.map(h => {
      const row = {
        'Material': materialTitle,
        'Page': h.page_number,
        'Text': h.text,
        'Category': h.category || 'General',
        'Color': h.color || '#FFFF00',
        'Date': h.createdAt ? new Date(h.createdAt).toLocaleString() : ''
      };

      if (includeNotes) {
        row['Notes'] = h.notes || '';
      }

      if (includeTags && h.tags) {
        row['Tags'] = Array.isArray(h.tags) ? h.tags.join(', ') : '';
      }

      return row;
    });

    // Convert to CSV
    const csv = Papa.unparse(data);

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `highlights_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true };

  } catch (error) {
    console.error('Error exporting highlights to CSV:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export annotations to PDF
 * @param {Array} annotations - Array of annotation objects
 * @param {Object} options - Export options
 */
export const exportAnnotationsToPDF = (annotations, options = {}) => {
  try {
    const {
      title = 'Study Annotations',
      groupBy = 'page', // 'page', 'type', 'priority'
      materialTitle = 'Study Material'
    } = options;

    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    const checkAddPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line, index) => {
        if (index > 0) checkAddPage();
        doc.text(line, x, y + (index * lineHeight));
      });
      return lines.length * lineHeight;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPosition);
    yPosition += 15;

    // Material
    if (materialTitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.text(`Material: ${materialTitle}`, margin, yPosition);
      yPosition += 10;
    }

    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Annotations: ${annotations.length}`, margin, yPosition);
    yPosition += 7;
    
    const resolved = annotations.filter(a => a.is_resolved).length;
    doc.text(`Resolved: ${resolved} | Unresolved: ${annotations.length - resolved}`, margin, yPosition);
    yPosition += 7;
    
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 12;

    // Line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Group annotations
    let groupedAnnotations = {};
    
    if (groupBy === 'page') {
      annotations.forEach(a => {
        const key = `Page ${a.page_number}`;
        if (!groupedAnnotations[key]) groupedAnnotations[key] = [];
        groupedAnnotations[key].push(a);
      });
    } else if (groupBy === 'type') {
      annotations.forEach(a => {
        const key = (a.type || 'note').toUpperCase();
        if (!groupedAnnotations[key]) groupedAnnotations[key] = [];
        groupedAnnotations[key].push(a);
      });
    } else if (groupBy === 'priority') {
      annotations.forEach(a => {
        const key = (a.priority || 'medium').toUpperCase();
        if (!groupedAnnotations[key]) groupedAnnotations[key] = [];
        groupedAnnotations[key].push(a);
      });
    }

    // Render grouped annotations
    Object.keys(groupedAnnotations).sort().forEach((group) => {
      checkAddPage(30);

      // Group header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(group, margin, yPosition);
      yPosition += 10;

      groupedAnnotations[group].forEach((annotation, index) => {
        checkAddPage(50);

        // Annotation number and type
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const typeIcon = getAnnotationIcon(annotation.type);
        doc.text(`${index + 1}. ${typeIcon} ${annotation.type?.toUpperCase() || 'NOTE'}`, margin, yPosition);
        
        // Status badge
        if (annotation.is_resolved) {
          doc.setTextColor(0, 150, 0);
          doc.text('✓ RESOLVED', pageWidth - margin - 30, yPosition);
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(200, 0, 0);
          doc.text('⏳ OPEN', pageWidth - margin - 30, yPosition);
          doc.setTextColor(0, 0, 0);
        }
        
        yPosition += 10;

        // Content
        doc.setFont('helvetica', 'normal');
        const contentHeight = addWrappedText(
          annotation.content,
          margin + 5,
          yPosition,
          maxWidth - 5,
          10
        );
        yPosition += contentHeight + 5;

        // Metadata
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        let info = [];
        if (groupBy !== 'page') info.push(`Page ${annotation.page_number}`);
        if (groupBy !== 'priority' && annotation.priority) {
          info.push(`Priority: ${annotation.priority}`);
        }
        if (annotation.tags && annotation.tags.length > 0) {
          info.push(`Tags: ${annotation.tags.join(', ')}`);
        }
        if (annotation.createdAt) {
          info.push(new Date(annotation.createdAt).toLocaleDateString());
        }
        
        doc.text(info.join(' | '), margin + 5, yPosition);
        yPosition += 10;
      });

      yPosition += 5;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    const filename = `annotations_${Date.now()}.pdf`;
    doc.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('Error exporting annotations to PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export session summary to PDF
 * @param {Object} sessionData - Session data object
 * @param {Object} options - Export options
 */
export const exportSessionSummaryToPDF = (sessionData, options = {}) => {
  try {
    const {
      includeMetrics = true,
      includeHighlights = true,
      includeAnnotations = true,
      includeCharts = false
    } = options;

    const doc = new jsPDF();
    let yPosition = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const checkAddPage = () => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Study Session Summary', margin, yPosition);
    yPosition += 15;

    // Session info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(sessionData.start_time).toLocaleString()}`, margin, yPosition);
    yPosition += 8;
    
    if (sessionData.duration) {
      doc.text(`Duration: ${Math.round(sessionData.duration / 60)} minutes`, margin, yPosition);
      yPosition += 8;
    }
    
    if (sessionData.material_title) {
      doc.text(`Material: ${sessionData.material_title}`, margin, yPosition);
      yPosition += 15;
    }

    // Metrics
    if (includeMetrics && sessionData.metrics) {
      checkAddPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance Metrics', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const metrics = [
        `Engagement Score: ${sessionData.metrics.avg_engagement || 0}/100`,
        `Presence Rate: ${sessionData.metrics.presence_rate || 0}%`,
        `Average Posture: ${sessionData.metrics.avg_posture || 0}/100`,
        `Distractions: ${sessionData.metrics.distraction_count || 0}`,
        `Highlights Created: ${sessionData.highlights_count || 0}`,
        `Annotations Added: ${sessionData.annotations_count || 0}`
      ];

      metrics.forEach(metric => {
        doc.text(metric, margin + 5, yPosition);
        yPosition += 7;
      });
      yPosition += 10;
    }

    // Highlights summary
    if (includeHighlights && sessionData.highlights && sessionData.highlights.length > 0) {
      checkAddPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Highlights (${sessionData.highlights.length})`, margin, yPosition);
      yPosition += 10;

      sessionData.highlights.slice(0, 10).forEach((h, i) => {
        checkAddPage();
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const text = h.text.substring(0, 100) + (h.text.length > 100 ? '...' : '');
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - 10);
        doc.text(`${i + 1}. ${lines[0]}`, margin + 5, yPosition);
        yPosition += 6;
      });
      
      if (sessionData.highlights.length > 10) {
        doc.setFont('helvetica', 'italic');
        doc.text(`... and ${sessionData.highlights.length - 10} more`, margin + 5, yPosition);
      }
      yPosition += 10;
    }

    // Save
    const filename = `session_summary_${Date.now()}.pdf`;
    doc.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('Error exporting session summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate flashcards from highlights
 * @param {Array} highlights - Array of highlight objects
 * @returns {Object} - Flashcards data
 */
export const generateFlashcards = (highlights) => {
  try {
    const flashcards = highlights
      .filter(h => h.text && h.text.length > 10)
      .map((h, index) => ({
        id: h._id || index,
        front: h.text.substring(0, 150),
        back: h.notes || 'Add your notes here',
        category: h.category || 'General',
        page: h.page_number,
        color: h.color || '#FFFF00'
      }));

    return {
      success: true,
      flashcards,
      count: flashcards.length
    };

  } catch (error) {
    console.error('Error generating flashcards:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export flashcards to printable PDF
 * @param {Array} flashcards - Array of flashcard objects
 */
export const exportFlashcardsToPDF = (flashcards) => {
  try {
    const doc = new jsPDF();
    const cardWidth = 80;
    const cardHeight = 50;
    const margin = 15;
    let xPosition = margin;
    let yPosition = margin;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    flashcards.forEach((card, index) => {
      // Check if we need a new page
      if (yPosition + cardHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        xPosition = margin;
      }

      // Draw card border
      doc.setDrawColor(0, 0, 0);
      doc.rect(xPosition, yPosition, cardWidth, cardHeight);

      // Card number
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`#${index + 1}`, xPosition + 2, yPosition + 5);

      // Front (Question)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Q:', xPosition + 5, yPosition + 15);
      
      doc.setFont('helvetica', 'normal');
      const frontLines = doc.splitTextToSize(card.front, cardWidth - 15);
      doc.text(frontLines.slice(0, 3), xPosition + 12, yPosition + 15);

      // Back (Answer) - on bottom half
      doc.setFont('helvetica', 'bold');
      doc.text('A:', xPosition + 5, yPosition + 35);
      
      doc.setFont('helvetica', 'normal');
      const backLines = doc.splitTextToSize(card.back, cardWidth - 15);
      doc.text(backLines.slice(0, 2), xPosition + 12, yPosition + 35);

      // Category badge
      if (card.category) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(card.category, xPosition + cardWidth - 25, yPosition + cardHeight - 2);
      }

      // Move to next position
      xPosition += cardWidth + 10;
      if (xPosition + cardWidth > pageWidth - margin) {
        xPosition = margin;
        yPosition += cardHeight + 10;
      }
    });

    const filename = `flashcards_${Date.now()}.pdf`;
    doc.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('Error exporting flashcards:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create study guide from highlights and annotations
 * @param {Object} data - Contains highlights and annotations
 */
export const createStudyGuide = (data) => {
  try {
    const { highlights = [], annotations = [], materialTitle = 'Study Material' } = data;

    const doc = new jsPDF();
    let yPosition = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const maxWidth = pageWidth - (margin * 2);

    const checkAddPage = () => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Study Guide', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.text(materialTitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Key Concepts (from highlights by category)
    const categories = [...new Set(highlights.map(h => h.category).filter(Boolean))];
    
    categories.forEach(category => {
      checkAddPage();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(category.toUpperCase(), margin, yPosition);
      yPosition += 10;

      const categoryHighlights = highlights.filter(h => h.category === category);
      categoryHighlights.forEach((h, i) => {
        checkAddPage();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(`• ${h.text}`, maxWidth - 10);
        lines.forEach(line => {
          doc.text(line, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 3;
      });
      yPosition += 10;
    });

    // Questions to Review (from question-type annotations)
    const questions = annotations.filter(a => a.type === 'question');
    if (questions.length > 0) {
      checkAddPage();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('QUESTIONS TO REVIEW', margin, yPosition);
      yPosition += 10;

      questions.forEach((q, i) => {
        checkAddPage();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Q${i + 1}:`, margin, yPosition);
        
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(q.content, maxWidth - 15);
        lines.forEach(line => {
          doc.text(line, margin + 10, yPosition);
          yPosition += 6;
        });
        yPosition += 8;
      });
    }

    // Important Notes
    const notes = annotations.filter(a => a.priority === 'high');
    if (notes.length > 0) {
      checkAddPage();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('IMPORTANT NOTES', margin, yPosition);
      yPosition += 10;

      notes.forEach((n, i) => {
        checkAddPage();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(`⚠ ${n.content}`, maxWidth - 5);
        lines.forEach(line => {
          doc.text(line, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 8;
      });
    }

    const filename = `study_guide_${Date.now()}.pdf`;
    doc.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('Error creating study guide:', error);
    return { success: false, error: error.message };
  }
};

// Helper functions

/**
 * Convert hex color to RGB
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Get icon for annotation type
 */
const getAnnotationIcon = (type) => {
  const icons = {
    note: '📝',
    question: '❓',
    summary: '📋',
    insight: '💡',
    todo: '✅',
    definition: '📖'
  };
  return icons[type] || '📝';
};

export default {
  exportHighlightsToPDF,
  exportHighlightsToCSV,
  exportAnnotationsToPDF,
  exportSessionSummaryToPDF,
  generateFlashcards,
  exportFlashcardsToPDF,
  createStudyGuide
};