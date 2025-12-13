// frontend/src/components/student/PDFToolbar.js
import React, { useState } from 'react';
import {
  Highlighter,
  StickyNote,
  Bookmark,
  Search,
  ZoomIn,
  ZoomOut,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  List,
  MessageSquare,
  FileText,
  Edit3,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  ChevronDown,
  CheckCircle
} from 'lucide-react';

const PDFToolbar = ({
  onHighlightColorChange,
  onAnnotationTypeChange,
  onBookmarkAdd,
  onSearchToggle,
  onZoomChange,
  onDarkModeToggle,
  onFocusModeToggle,
  onExport,
  onShare,
  onTextToSpeechToggle,
  currentHighlightColor = 'yellow',
  currentAnnotationType = null,
  isDarkMode = false,
  isFocusMode = false,
  isTextToSpeechActive = false,
  zoom = 1.0
}) => {
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);

  const highlightColors = [
    { name: 'yellow', color: '#FFEB3B', label: 'Yellow' },
    { name: 'green', color: '#4CAF50', label: 'Green' },
    { name: 'blue', color: '#2196F3', label: 'Blue' },
    { name: 'pink', color: '#E91E63', label: 'Pink' },
    { name: 'orange', color: '#FF9800', label: 'Orange' },
    { name: 'purple', color: '#9C27B0', label: 'Purple' }
  ];

  const annotationTypes = [
    { type: 'note', icon: StickyNote, label: 'Note', color: 'text-yellow-600' },
    { type: 'question', icon: MessageSquare, label: 'Question', color: 'text-blue-600' },
    { type: 'summary', icon: FileText, label: 'Summary', color: 'text-green-600' },
    { type: 'comment', icon: Edit3, label: 'Comment', color: 'text-purple-600' }
  ];

  const handleHighlightColorSelect = (colorName) => {
    onHighlightColorChange(colorName);
    setShowHighlightMenu(false);
  };

  const handleAnnotationTypeSelect = (type) => {
    onAnnotationTypeChange(type);
    setShowAnnotationMenu(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      {/* Main Toolbar */}
      <div className="flex items-center justify-between px-4 py-3">
        
        {/* Left Section - Editing Tools */}
        <div className="flex items-center space-x-2">
          
          {/* Highlight Tool with Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowHighlightMenu(!showHighlightMenu)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
              title="Highlight Text"
            >
              <Highlighter className="h-5 w-5 text-gray-700" />
              <div
                className="w-4 h-4 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: highlightColors.find(c => c.name === currentHighlightColor)?.color }}
              />
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {/* Highlight Color Menu */}
            {showHighlightMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64 z-50">
                <div className="text-xs font-semibold text-gray-600 mb-2">Highlight Color</div>
                <div className="grid grid-cols-3 gap-2">
                  {highlightColors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => handleHighlightColorSelect(color.name)}
                      className={`flex items-center justify-center p-3 rounded-lg border-2 hover:scale-105 transition-transform ${
                        currentHighlightColor === color.name ? 'border-gray-800' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.color + '40' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: color.color }}
                      />
                      {currentHighlightColor === color.name && (
                        <CheckCircle className="h-4 w-4 text-gray-800 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Select text to highlight
                </div>
              </div>
            )}
          </div>

          {/* Annotation Tool */}
          <div className="relative">
            <button
              onClick={() => setShowAnnotationMenu(!showAnnotationMenu)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border ${
                currentAnnotationType 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'border-gray-300 hover:bg-gray-100'
              }`}
              title="Add Annotation"
            >
              <StickyNote className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">
                {currentAnnotationType ? 'Annotating' : 'Annotate'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Annotation Type Menu */}
            {showAnnotationMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-48 z-50">
                <div className="text-xs font-semibold text-gray-600 mb-2 px-2">Add Annotation</div>
                {annotationTypes.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => handleAnnotationTypeSelect(type)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      currentAnnotationType === type ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-sm">{label}</span>
                    {currentAnnotationType === type && (
                      <CheckCircle className="h-4 w-4 text-blue-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={onBookmarkAdd}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
            title="Add Bookmark"
          >
            <Bookmark className="h-5 w-5 text-gray-700" />
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300 mx-2" />

          {/* Search Button */}
          <button
            onClick={onSearchToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
            title="Search PDF"
          >
            <Search className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Center Section - Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onZoomChange(zoom - 0.1)}
            disabled={zoom <= 0.5}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5 text-gray-700" />
          </button>
          
          <div className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </div>
          
          <button
            onClick={() => onZoomChange(zoom + 0.1)}
            disabled={zoom >= 2.5}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Right Section - View & Export */}
        <div className="flex items-center space-x-2">
          
          {/* Text-to-Speech */}
          <button
            onClick={onTextToSpeechToggle}
            className={`p-2 rounded-lg transition-colors border ${
              isTextToSpeechActive
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
            title={isTextToSpeechActive ? 'Stop Reading' : 'Text to Speech'}
          >
            {isTextToSpeechActive ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5 text-gray-700" />
            )}
          </button>

          {/* View Options */}
          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
              title="View Options"
            >
              <Eye className="h-5 w-5 text-gray-700" />
              <span className="text-sm font-medium hidden lg:inline">View</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {/* View Menu */}
            {showViewMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-56 z-50">
                <button
                  onClick={() => {
                    onDarkModeToggle();
                    setShowViewMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {isDarkMode ? (
                      <Sun className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <Moon className="h-5 w-5 text-indigo-600" />
                    )}
                    <span className="text-sm">
                      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  </div>
                  {isDarkMode && <CheckCircle className="h-4 w-4 text-blue-600" />}
                </button>

                <button
                  onClick={() => {
                    onFocusModeToggle();
                    setShowViewMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {isFocusMode ? (
                      <Minimize2 className="h-5 w-5 text-gray-600" />
                    ) : (
                      <Maximize2 className="h-5 w-5 text-gray-600" />
                    )}
                    <span className="text-sm">
                      {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
                    </span>
                  </div>
                  {isFocusMode && <CheckCircle className="h-4 w-4 text-blue-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300 mx-2" />

          {/* Export Button */}
          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
            title="Export Highlights"
          >
            <Download className="h-5 w-5 text-gray-700" />
            <span className="text-sm font-medium hidden lg:inline">Export</span>
          </button>

          {/* Share Button */}
          <button
            onClick={onShare}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            title="Share with Teacher"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-sm font-medium hidden lg:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Secondary Toolbar - Quick Tips (Optional) */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 border-t border-gray-200">
        <div className="flex items-center justify-center text-xs text-gray-600">
          <span className="flex items-center space-x-1">
            <Highlighter className="h-3 w-3" />
            <span>Select text to highlight</span>
          </span>
          <span className="mx-4">•</span>
          <span className="flex items-center space-x-1">
            <StickyNote className="h-3 w-3" />
            <span>Click to add notes</span>
          </span>
          <span className="mx-4">•</span>
          <span className="flex items-center space-x-1">
            <Bookmark className="h-3 w-3" />
            <span>Bookmark important pages</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PDFToolbar;