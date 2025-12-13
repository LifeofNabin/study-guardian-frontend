// frontend/src/components/student/AnnotationPanel.js
import React, { useState, useMemo } from 'react';
import {
  StickyNote,
  MessageSquare,
  FileText,
  Edit3,
  Search,
  Filter,
  Tag,
  MapPin,
  Calendar,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Share2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  MoreVertical
} from 'lucide-react';

const AnnotationPanel = ({
  annotations = [],
  onAnnotationClick,
  onAnnotationEdit,
  onAnnotationDelete,
  onAnnotationResolve,
  onAnnotationShare,
  currentPage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [expandedAnnotation, setExpandedAnnotation] = useState(null);

  const annotationTypes = [
    { value: 'all', label: 'All Types', icon: StickyNote, color: 'text-gray-600' },
    { value: 'note', label: 'Note', icon: StickyNote, color: 'text-yellow-600' },
    { value: 'question', label: 'Question', icon: MessageSquare, color: 'text-blue-600' },
    { value: 'summary', label: 'Summary', icon: FileText, color: 'text-green-600' },
    { value: 'comment', label: 'Comment', icon: Edit3, color: 'text-purple-600' }
  ];

  const priorities = [
    { value: 'all', label: 'All Priority' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' }
  ];

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    let filtered = annotations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(a => a.priority === selectedPriority);
    }

    // Show/hide resolved
    if (!showResolved) {
      filtered = filtered.filter(a => !a.is_resolved);
    }

    return filtered.sort((a, b) => {
      // Sort by page, then by priority
      if (a.page_number !== b.page_number) {
        return a.page_number - b.page_number;
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [annotations, searchTerm, selectedType, selectedPriority, showResolved]);

  // Statistics
  const stats = useMemo(() => {
    const typeCount = {};
    const priorityCount = {};
    annotations.forEach(a => {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
      priorityCount[a.priority] = (priorityCount[a.priority] || 0) + 1;
    });

    return {
      total: annotations.length,
      unresolved: annotations.filter(a => !a.is_resolved).length,
      resolved: annotations.filter(a => a.is_resolved).length,
      byType: typeCount,
      byPriority: priorityCount
    };
  }, [annotations]);

  const getTypeIcon = (type) => {
    const typeConfig = annotationTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : StickyNote;
  };

  const getTypeColor = (type) => {
    const typeConfig = annotationTypes.find(t => t.value === type);
    return typeConfig?.color || 'text-gray-600';
  };

  const getPriorityBadge = (priority) => {
    const config = priorities.find(p => p.value === priority);
    return config?.color || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const startEdit = (annotation) => {
    setEditingId(annotation._id);
    setEditContent(annotation.content);
    setEditTags(annotation.tags?.join(', ') || '');
  };

  const saveEdit = () => {
    if (editingId && onAnnotationEdit) {
      onAnnotationEdit(editingId, {
        content: editContent,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setEditingId(null);
      setEditContent('');
      setEditTags('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditTags('');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <StickyNote className="h-5 w-5 mr-2 text-purple-600" />
            Annotations ({filteredAnnotations.length})
          </h3>
        </div>

        {/* Stats Quick View */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-yellow-600">{stats.unresolved}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-600">{stats.resolved}</div>
            <div className="text-xs text-gray-600">Resolved</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search annotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
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
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            {annotationTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Show Resolved Toggle */}
        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="mr-2 rounded"
          />
          Show resolved annotations
        </label>
      </div>

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <StickyNote className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium mb-2">No annotations</p>
            <p className="text-sm text-gray-500">
              {searchTerm || selectedType !== 'all' || selectedPriority !== 'all'
                ? 'No annotations match your filters'
                : 'Click to add your first annotation'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredAnnotations.map((annotation) => {
              const Icon = getTypeIcon(annotation.type);
              const isEditing = editingId === annotation._id;
              const isExpanded = expandedAnnotation === annotation._id;

              return (
                <div
                  key={annotation._id}
                  className={`rounded-lg p-4 border-2 transition-all ${
                    annotation.page_number === currentPage
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-200'
                  } ${annotation.is_resolved ? 'opacity-60' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-2 flex-1">
                      <Icon className={`h-5 w-5 mt-0.5 ${getTypeColor(annotation.type)}`} />
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-600 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            Page {annotation.page_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(annotation.priority)}`}>
                            {annotation.priority}
                          </span>
                          {annotation.is_resolved && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(annotation.created_at)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedAnnotation(isExpanded ? null : annotation._id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-2 mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        rows="3"
                      />
                      <input
                        type="text"
                        placeholder="Tags (comma separated)"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ) : (
                    <div
                      className="text-sm text-gray-800 mb-3 cursor-pointer"
                      onClick={() => onAnnotationClick(annotation)}
                    >
                      {isExpanded ? annotation.content : (
                        annotation.content.length > 150
                          ? annotation.content.substring(0, 150) + '...'
                          : annotation.content
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {!isEditing && annotation.tags && annotation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {annotation.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {isExpanded && annotation.ai_suggestions && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        AI Suggestion
                      </div>
                      <p className="text-xs text-blue-800">{annotation.ai_suggestions}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    {isEditing ? (
                      <div className="flex space-x-2 w-full">
                        <button
                          onClick={saveEdit}
                          className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          {!annotation.is_resolved && (
                            <button
                              onClick={() => onAnnotationResolve(annotation._id)}
                              className="p-1 hover:bg-green-50 rounded transition-colors"
                              title="Mark as resolved"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(annotation)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          {annotation.is_shared ? (
                            <Share2 className="h-4 w-4 text-blue-600" title="Shared" />
                          ) : (
                            <button
                              onClick={() => onAnnotationShare(annotation._id)}
                              className="p-1 hover:bg-blue-50 rounded transition-colors"
                              title="Share with teacher"
                            >
                              <Share2 className="h-4 w-4 text-gray-600" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this annotation?')) {
                              onAnnotationDelete(annotation._id);
                            }
                          }}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredAnnotations.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Showing {filteredAnnotations.length} of {annotations.length}</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedPriority('all');
              }}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationPanel;