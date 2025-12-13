// frontend/src/components/student/HighlightPanel.js
import React, { useState, useMemo } from 'react';
import {
  Highlighter,
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  MapPin,
  Tag,
  Calendar,
  BarChart3,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle
} from 'lucide-react';

const HighlightPanel = ({ 
  highlights = [], 
  onHighlightClick, 
  onHighlightEdit, 
  onHighlightDelete,
  onExport,
  currentPage 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('page'); // page, recent, color
  const [showStats, setShowStats] = useState(false);
  const [expandedHighlight, setExpandedHighlight] = useState(null);

  const colors = [
    { name: 'all', color: '#000000', label: 'All Colors' },
    { name: 'yellow', color: '#FFEB3B', label: 'Yellow' },
    { name: 'green', color: '#4CAF50', label: 'Green' },
    { name: 'blue', color: '#2196F3', label: 'Blue' },
    { name: 'pink', color: '#E91E63', label: 'Pink' },
    { name: 'orange', color: '#FF9800', label: 'Orange' },
    { name: 'purple', color: '#9C27B0', label: 'Purple' }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'important', label: 'Important' },
    { value: 'definition', label: 'Definition' },
    { value: 'example', label: 'Example' },
    { value: 'formula', label: 'Formula' },
    { value: 'question', label: 'Question' },
    { value: 'review', label: 'Review' }
  ];

  // Filter and sort highlights
  const filteredHighlights = useMemo(() => {
    let filtered = highlights;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(h => 
        h.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Color filter
    if (selectedColor !== 'all') {
      filtered = filtered.filter(h => h.color === selectedColor);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(h => h.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'page':
        return filtered.sort((a, b) => a.page_number - b.page_number);
      case 'recent':
        return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'color':
        return filtered.sort((a, b) => a.color.localeCompare(b.color));
      default:
        return filtered;
    }
  }, [highlights, searchTerm, selectedColor, selectedCategory, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const colorCount = {};
    const categoryCount = {};
    const pageCount = {};

    highlights.forEach(h => {
      colorCount[h.color] = (colorCount[h.color] || 0) + 1;
      categoryCount[h.category] = (categoryCount[h.category] || 0) + 1;
      pageCount[h.page_number] = (pageCount[h.page_number] || 0) + 1;
    });

    return {
      total: highlights.length,
      byColor: colorCount,
      byCategory: categoryCount,
      byPage: pageCount,
      mostHighlightedPage: Object.entries(pageCount).sort((a, b) => b[1] - a[1])[0]
    };
  }, [highlights]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleExport = () => {
    if (onExport) {
      onExport(filteredHighlights);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Highlighter className="h-5 w-5 mr-2 text-yellow-600" />
            Highlights ({filteredHighlights.length})
          </h3>
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            title="Statistics"
          >
            <BarChart3 className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search highlights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Color Filter */}
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            {colors.map(color => (
              <option key={color.name} value={color.name}>
                {color.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Sort by:</span>
          <div className="flex space-x-1">
            {['page', 'recent', 'color'].map(sort => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === sort
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={filteredHighlights.length === 0}
          className="w-full mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Highlights
        </button>
      </div>

      {/* Statistics Panel */}
      {showStats && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Statistics</h4>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs text-gray-600">Total Highlights</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-800">
                {stats.mostHighlightedPage?.[0] || '-'}
              </div>
              <div className="text-xs text-gray-600">Most Highlighted</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xs font-semibold text-gray-600 mb-2">By Color</div>
            <div className="space-y-1">
              {Object.entries(stats.byColor).map(([color, count]) => (
                <div key={color} className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: colors.find(c => c.name === color)?.color }}
                    />
                    <span className="capitalize">{color}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Highlights List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHighlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Highlighter className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium mb-2">No highlights yet</p>
            <p className="text-sm text-gray-500">
              {searchTerm || selectedColor !== 'all' || selectedCategory !== 'all'
                ? 'No highlights match your filters'
                : 'Select text to create your first highlight'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredHighlights.map((highlight) => (
              <div
                key={highlight._id}
                className={`border-l-4 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                  highlight.page_number === currentPage ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-white'
                }`}
                style={{ borderLeftColor: colors.find(c => c.name === highlight.color)?.color }}
                onClick={() => onHighlightClick(highlight)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">
                      Page {highlight.page_number}
                    </span>
                    {highlight.category && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {highlight.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedHighlight(
                          expandedHighlight === highlight._id ? null : highlight._id
                        );
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedHighlight === highlight._id ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Highlighted Text */}
                <p className="text-sm text-gray-800 mb-2">
                  {expandedHighlight === highlight._id
                    ? highlight.text
                    : truncateText(highlight.text, 150)}
                </p>

                {/* Notes */}
                {highlight.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                    <p className="text-xs text-gray-700">{highlight.notes}</p>
                  </div>
                )}

                {/* Tags */}
                {highlight.tags && highlight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {highlight.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(highlight.created_at)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {highlight.is_reviewed && (
                      <CheckCircle className="h-4 w-4 text-green-600" title="Reviewed" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlightEdit(highlight);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this highlight?')) {
                          onHighlightDelete(highlight._id);
                        }
                      }}
                      className="p-1 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {filteredHighlights.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Showing {filteredHighlights.length} of {highlights.length}</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedColor('all');
                setSelectedCategory('all');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightPanel;