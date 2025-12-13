import React, { useState } from 'react';
import {
  exportHighlightsToPDF,
  exportHighlightsToCSV,
  exportAnnotationsToPDF,
  exportSessionSummaryToPDF,
  generateFlashcards,
  exportFlashcardsToPDF,
  createStudyGuide
} from '../../utils/exportUtils';

const ExportModal = ({ 
  isOpen, 
  onClose, 
  highlights = [], 
  annotations = [], 
  sessionData = null,
  materialTitle = 'Study Material'
}) => {
  const [exportType, setExportType] = useState('highlights'); // highlights, annotations, summary, flashcards, studyGuide
  const [format, setFormat] = useState('pdf'); // pdf, csv, json
  const [options, setOptions] = useState({
    includeNotes: true,
    includeTags: true,
    groupBy: 'page', // page, category, color, type
    includeMetrics: true,
    includeCharts: false
  });
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      let result;

      switch (exportType) {
        case 'highlights':
          if (format === 'pdf') {
            result = exportHighlightsToPDF(highlights, {
              title: 'Study Highlights',
              materialTitle,
              groupBy: options.groupBy,
              includeNotes: options.includeNotes
            });
          } else if (format === 'csv') {
            result = exportHighlightsToCSV(highlights, {
              materialTitle,
              includeNotes: options.includeNotes,
              includeTags: options.includeTags
            });
          }
          break;

        case 'annotations':
          if (format === 'pdf') {
            result = exportAnnotationsToPDF(annotations, {
              title: 'Study Annotations',
              materialTitle,
              groupBy: options.groupBy
            });
          }
          break;

        case 'summary':
          if (format === 'pdf') {
            result = exportSessionSummaryToPDF(sessionData, {
              includeMetrics: options.includeMetrics,
              includeHighlights: true,
              includeAnnotations: true,
              includeCharts: options.includeCharts
            });
          }
          break;

        case 'flashcards':
          const flashcardData = generateFlashcards(highlights);
          if (flashcardData.success) {
            result = exportFlashcardsToPDF(flashcardData.flashcards);
          }
          break;

        case 'studyGuide':
          result = createStudyGuide({
            highlights,
            annotations,
            materialTitle
          });
          break;

        default:
          result = { success: false, error: 'Invalid export type' };
      }

      if (result && result.success) {
        // Show success message
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        alert('Export failed: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    if (exportType === 'flashcards') {
      const result = generateFlashcards(highlights);
      if (result.success) {
        setFlashcards(result.flashcards);
        setPreviewMode(true);
      }
    }
  };

  const getExportDescription = () => {
    switch (exportType) {
      case 'highlights':
        return `Export ${highlights.length} highlights in ${format.toUpperCase()} format`;
      case 'annotations':
        return `Export ${annotations.length} annotations in ${format.toUpperCase()} format`;
      case 'summary':
        return 'Export complete session summary with metrics and analytics';
      case 'flashcards':
        return `Generate ${highlights.length} flashcards from your highlights`;
      case 'studyGuide':
        return 'Create a comprehensive study guide from all your notes';
      default:
        return '';
    }
  };

  const getAvailableFormats = () => {
    switch (exportType) {
      case 'highlights':
        return ['pdf', 'csv'];
      case 'annotations':
        return ['pdf', 'csv'];
      case 'summary':
        return ['pdf'];
      case 'flashcards':
        return ['pdf'];
      case 'studyGuide':
        return ['pdf'];
      default:
        return ['pdf'];
    }
  };

  const availableFormats = getAvailableFormats();

  // Preview Mode for Flashcards
  if (previewMode && flashcards) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Preview Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">🎴 Flashcards Preview</h2>
                <p className="text-purple-100 mt-1">{flashcards.length} cards generated</p>
              </div>
              <button
                onClick={() => setPreviewMode(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Flashcards Grid */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashcards.slice(0, 12).map((card, index) => (
                <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="text-xs text-gray-500 mb-2">Card #{index + 1}</div>
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-purple-600 mb-1">Question:</div>
                    <div className="text-sm text-gray-900 line-clamp-3">{card.front}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-600 mb-1">Answer:</div>
                    <div className="text-sm text-gray-700 line-clamp-2">{card.back}</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{card.category}</span>
                    <span className="text-xs text-gray-500">Page {card.page}</span>
                  </div>
                </div>
              ))}
            </div>
            {flashcards.length > 12 && (
              <div className="text-center mt-4 text-sm text-gray-500">
                ... and {flashcards.length - 12} more cards
              </div>
            )}
          </div>

          {/* Preview Footer */}
          <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
            <button
              onClick={() => setPreviewMode(false)}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Exporting...' : '📥 Export as PDF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Export Modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📥 Export Options</h2>
              <p className="text-blue-100 mt-1">Choose what and how to export</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Export Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What would you like to export?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setExportType('highlights')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  exportType === 'highlights'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">✨</span>
                  <span className="font-semibold text-gray-900">Highlights</span>
                </div>
                <p className="text-sm text-gray-600">{highlights.length} highlights available</p>
              </button>

              <button
                onClick={() => setExportType('annotations')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  exportType === 'annotations'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📝</span>
                  <span className="font-semibold text-gray-900">Annotations</span>
                </div>
                <p className="text-sm text-gray-600">{annotations.length} annotations available</p>
              </button>

              <button
                onClick={() => setExportType('summary')}
                disabled={!sessionData}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  exportType === 'summary'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!sessionData ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📊</span>
                  <span className="font-semibold text-gray-900">Session Summary</span>
                </div>
                <p className="text-sm text-gray-600">Complete session report</p>
              </button>

              <button
                onClick={() => setExportType('flashcards')}
                disabled={highlights.length === 0}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  exportType === 'flashcards'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${highlights.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎴</span>
                  <span className="font-semibold text-gray-900">Flashcards</span>
                </div>
                <p className="text-sm text-gray-600">Generate from highlights</p>
              </button>

              <button
                onClick={() => setExportType('studyGuide')}
                disabled={highlights.length === 0 && annotations.length === 0}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  exportType === 'studyGuide'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${highlights.length === 0 && annotations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📖</span>
                  <span className="font-semibold text-gray-900">Study Guide</span>
                </div>
                <p className="text-sm text-gray-600">Comprehensive guide</p>
              </button>
            </div>
          </div>

          {/* Format Selection */}
          {availableFormats.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Export Format
              </label>
              <div className="flex gap-3">
                {availableFormats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                      format === fmt
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Export Options
            </label>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              {(exportType === 'highlights' || exportType === 'annotations') && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Group by</span>
                  <select
                    value={options.groupBy}
                    onChange={(e) => setOptions({ ...options, groupBy: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="page">Page</option>
                    <option value="category">Category</option>
                    {exportType === 'highlights' && <option value="color">Color</option>}
                    {exportType === 'annotations' && <option value="type">Type</option>}
                  </select>
                </div>
              )}

              {exportType === 'highlights' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Include notes</span>
                    <button
                      onClick={() => setOptions({ ...options, includeNotes: !options.includeNotes })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        options.includeNotes ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          options.includeNotes ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {format === 'csv' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Include tags</span>
                      <button
                        onClick={() => setOptions({ ...options, includeTags: !options.includeTags })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          options.includeTags ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            options.includeTags ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </>
              )}

              {exportType === 'summary' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Include metrics</span>
                    <button
                      onClick={() => setOptions({ ...options, includeMetrics: !options.includeMetrics })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        options.includeMetrics ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          options.includeMetrics ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Include charts</span>
                    <button
                      onClick={() => setOptions({ ...options, includeCharts: !options.includeCharts })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        options.includeCharts ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          options.includeCharts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Export Details</h4>
                <p className="text-sm text-blue-800">{getExportDescription()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-between items-center">
          <div>
            {exportType === 'flashcards' && (
              <button
                onClick={generatePreview}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                👁️ Preview Flashcards
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Export Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;