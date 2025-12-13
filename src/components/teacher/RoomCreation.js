import React, { useState } from 'react';
import { X, BookOpen, Clock, FileText, Plus, Sparkles, Calendar, Edit } from 'lucide-react';
import { roomsAPI } from '../../services/api'; 

const RoomCreation = ({ onClose, onRoomCreated, editRoom = null }) => {
  const isEditMode = !!editRoom;
  
  const [formData, setFormData] = useState(editRoom ? {
    subject: editRoom.subject || '',
    title: editRoom.title || '',
    expected_duration: editRoom.expected_duration || 60,
    description: editRoom.description || '',
    startDate: editRoom.startDate || new Date().toISOString().split('T')[0],
    endDate: editRoom.endDate || new Date().toISOString().split('T')[0],
  } : {
    subject: '',
    title: '',
    expected_duration: 60,
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const [attachedFile, setAttachedFile] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  const subjects = [
    { value: 'Mathematics', emoji: '📐', color: '#3b82f6' },
    { value: 'Science', emoji: '🔬', color: '#10b981' },
    { value: 'English', emoji: '📚', color: '#8b5cf6' },
    { value: 'History', emoji: '🏛️', color: '#f59e0b' },
    { value: 'Geography', emoji: '🌍', color: '#06b6d4' },
    { value: 'Physics', emoji: '⚡', color: '#6366f1' },
    { value: 'Chemistry', emoji: '🧪', color: '#ec4899' },
    { value: 'Biology', emoji: '🧬', color: '#14b8a6' },
    { value: 'Computer Science', emoji: '💻', color: '#0ea5e9' },
    { value: 'Arts', emoji: '🎨', color: '#f43f5e' },
    { value: 'Music', emoji: '🎵', color: '#a855f7' },
    { value: 'Physical Education', emoji: '⚽', color: '#84cc16' },
  ];

  const durations = [
    { value: 30, label: '30 minutes', desc: 'Quick session' },
    { value: 45, label: '45 minutes', desc: 'Standard class' },
    { value: 60, label: '1 hour', desc: 'Full session' },
    { value: 90, label: '1.5 hours', desc: 'Extended' },
    { value: 120, label: '2 hours', desc: 'Workshop' },
    { value: 180, label: '3 hours', desc: 'Deep dive' },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const generateRoomTitle = () => {
    if (!formData.subject) {
      setError('Please select a subject first');
      return;
    }
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const titles = [
      `${formData.subject} Study Session - ${date}`,
      `${formData.subject} Class - ${date}`,
      `${formData.subject} Workshop`,
      `Introduction to ${formData.subject}`,
      `${formData.subject} Revision Session`,
      `Advanced ${formData.subject}`,
    ];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    handleChange('title', randomTitle);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.subject || !formData.title || !formData.startDate || !formData.endDate) {
      setError('Please select a subject, enter a title, and specify a start/end date.');
      return;
    }
    
    if (!formData.expected_duration || formData.expected_duration < 10) {
        setError('Please specify a valid expected duration (minimum 10 minutes).');
        return;
    }

    // Date validation
    if (!isEditMode && new Date(formData.startDate) < new Date().setHours(0, 0, 0, 0)) {
      setError('Start date cannot be in the past.');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
        setError('End Date cannot be before Start Date.');
        return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (isEditMode) {
        // Update existing room
        const response = await roomsAPI.update(editRoom._id, formData);
        onRoomCreated({ ...editRoom, ...formData });
        onClose();
      } else {
        // Create new room with FormData for file upload
        const data = new FormData();
        
        Object.keys(formData).forEach(key => {
          const value = key === 'expected_duration' ? String(formData[key]) : formData[key];
          data.append(key, value);
        });
        
        if (attachedFile) {
          data.append('attachment', attachedFile);
        }

        const response = await roomsAPI.create(data); 
        onRoomCreated(response.data.room);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} room.`);
    } finally {
      setLoading(false);
    }
  };

  const selectedSubject = subjects.find(s => s.value === formData.subject);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                {isEditMode ? <Edit className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{isEditMode ? 'Edit Room' : 'Create Study Room'}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {isEditMode ? 'Update room details' : 'Set up a new learning space for your students'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Subject Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Select Subject *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {subjects.map((subject) => (
                <button
                  key={subject.value}
                  type="button"
                  onClick={() => {
                    handleChange('subject', subject.value);
                    setIsCustomSubject(false);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-center hover:scale-105 ${
                    formData.subject === subject.value && !isCustomSubject
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{subject.emoji}</div>
                  <div className="text-sm font-medium text-gray-700">{subject.value}</div>
                </button>
              ))}
              
              <button
                key="custom-subject"
                type="button"
                onClick={() => {
                  setIsCustomSubject(true);
                  handleChange('subject', '');
                }}
                className={`p-4 rounded-xl border-2 transition-all text-center hover:scale-105 ${
                    isCustomSubject
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">✏️</div>
                <div className="text-sm font-medium text-gray-700">Custom Subject</div>
              </button>
            </div>
            
            {isCustomSubject && (
                <div className="mt-4">
                    <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        placeholder="Enter your subject"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                        required
                    />
                </div>
            )}
          </div>

          {/* Room Title */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <FileText className="w-5 h-5 text-purple-600" />
              Room Title *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Mathematics Study Session"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
              <button
                type="button"
                onClick={generateRoomTitle}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
                title="Generate random title"
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </button>
            </div>
          </div>

          {/* Session Dates */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Session Dates *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  min={!isEditMode ? new Date().toISOString().split('T')[0] : undefined}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  min={formData.startDate}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Duration Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <Clock className="w-5 h-5 text-green-600" />
              Expected Duration (Minutes) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {durations.map((duration) => (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() => {
                    handleChange('expected_duration', duration.value);
                    setIsCustomDuration(false);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                    formData.expected_duration === duration.value && !isCustomDuration
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-800">{duration.label}</div>
                  <div className="text-sm text-gray-500">{duration.desc}</div>
                </button>
              ))}
              
              <button
                key="custom"
                type="button"
                onClick={() => {
                  setIsCustomDuration(true);
                  if (!formData.expected_duration || formData.expected_duration <= 0 || !isCustomDuration) {
                     handleChange('expected_duration', 60);
                  }
                }}
                className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                    isCustomDuration
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-800">Custom</div>
                <div className="text-sm text-gray-500">Enter minutes</div>
              </button>
            </div>
            
            {isCustomDuration && (
                <div className="mt-3">
                    <input
                        type="number"
                        min="10"
                        value={formData.expected_duration}
                        onChange={(e) => {
                            const value = parseInt(e.target.value);
                            handleChange('expected_duration', isNaN(value) ? '' : value);
                        }}
                        placeholder="e.g., 75"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                        required={isCustomDuration}
                    />
                </div>
            )}
          </div>

          {/* PDF Attachment (only for create mode) */}
          {!isEditMode && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                <FileText className="w-5 h-5 text-red-600" />
                Attach Material (PDF, Optional)
              </label>
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {attachedFile ? (
                    <p className="text-sm text-gray-600 font-medium">{attachedFile.name}</p>
                  ) : (
                    <>
                      <FileText className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-400">PDF only (max 10MB)</p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  id="file-upload" 
                  accept="application/pdf"
                  onChange={(e) => setAttachedFile(e.target.files[0])} 
                  className="hidden" 
                />
              </label>
              {attachedFile && (
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-sm text-red-500 hover:text-red-700 mt-1"
                >
                  Remove File ({attachedFile.name})
                </button>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <FileText className="w-5 h-5 text-orange-600" />
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add details about this study session..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.subject || !formData.title || !formData.expected_duration || !formData.startDate || !formData.endDate}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating Room...'}
                </>
              ) : (
                <>
                  {isEditMode ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {isEditMode ? 'Update Room' : 'Create Room'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCreation;