// ============================================================================
// FILE: frontend/src/components/student/StudyPlan.js
// ✅ FIXED: PDFs now persist to database and appear after refresh
// ============================================================================

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  PlayCircle,
  BookOpen,
  X,
  Save,
  Upload,
  File,
  Paperclip,
  AlertCircle,
  Check
} from 'lucide-react';
import { routinesAPI } from '../../services/api';

// ============================================================================
// PATH NORMALIZATION UTILITY
// ============================================================================

const normalizePath = (path) => {
  if (!path) return null;
  if (path.startsWith('/uploads/')) return path;
  if (path.includes('/uploads/')) {
    const uploadsIndex = path.indexOf('/uploads/');
    return path.substring(uploadsIndex);
  }
  if (!path.includes('/')) return `/uploads/routines/${path}`;
  return path;
};

const StudyPlan = ({ routines = [], onBack, onRoutineCreated, onStartSession }) => {
  const safeRoutines = Array.isArray(routines) ? routines : [];
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  
  // Get tomorrow's date as default end date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'weekly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: tomorrow.toISOString().split('T')[0],
    subjects: [{ name: '', targetHours: 1, pdf: null, pdfName: '' }],
    studyTimeSlots: [{ day: 'Monday', startTime: '09:00', endTime: '11:00' }]
  });
  
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubjectChange = (index, field, value) => {
    const newSubjects = [...formData.subjects];
    newSubjects[index][field] = value;
    setFormData({ ...formData, subjects: newSubjects });
  };

  const handleSubjectPDFUpload = (index, file) => {
    if (file && file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) {
        alert('PDF file must be less than 10MB');
        return;
      }
      const newSubjects = [...formData.subjects];
      newSubjects[index].pdf = file;
      newSubjects[index].pdfName = file.name;
      setFormData({ ...formData, subjects: newSubjects });
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const removeSubjectPDF = (index) => {
    const newSubjects = [...formData.subjects];
    newSubjects[index].pdf = null;
    newSubjects[index].pdfName = '';
    setFormData({ ...formData, subjects: newSubjects });
  };

  const handleTimeSlotChange = (index, field, value) => {
    const newSlots = [...formData.studyTimeSlots];
    newSlots[index][field] = value;
    setFormData({ ...formData, studyTimeSlots: newSlots });
  };

  const addSubject = () => {
    setFormData({
      ...formData,
      subjects: [...formData.subjects, { name: '', targetHours: 1, pdf: null, pdfName: '' }]
    });
  };

  const removeSubject = (index) => {
    const newSubjects = formData.subjects.filter((_, i) => i !== index);
    setFormData({ ...formData, subjects: newSubjects });
  };

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      studyTimeSlots: [...formData.studyTimeSlots, { day: 'Monday', startTime: '09:00', endTime: '11:00' }]
    });
  };

  const removeTimeSlot = (index) => {
    const newSlots = formData.studyTimeSlots.filter((_, i) => i !== index);
    setFormData({ ...formData, studyTimeSlots: newSlots });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('🚀 Submitting routine form...');
    console.log('📋 Current formData:', formData);

    try {
      // Validate required fields
      if (!formData.title || !formData.title.trim()) {
        alert('Please enter a routine title');
        setIsSubmitting(false);
        return;
      }

      if (!formData.startDate) {
        alert('Please select a start date');
        setIsSubmitting(false);
        return;
      }

      if (!formData.endDate) {
        alert('Please select an end date');
        setIsSubmitting(false);
        return;
      }

      // Validate at least one valid subject
      const validSubjects = formData.subjects.filter(s => {
        const hasName = s.name && s.name.trim().length > 0;
        const hasValidHours = s.targetHours && parseFloat(s.targetHours) > 0;
        return hasName && hasValidHours;
      });

      if (validSubjects.length === 0) {
        alert('Please add at least one subject with a name and target hours greater than 0');
        setIsSubmitting(false);
        return;
      }

      // Validate dates
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        alert('End date must be after start date');
        setIsSubmitting(false);
        return;
      }

      const firstTimeSlot = formData.studyTimeSlots[0] || { startTime: '09:00', endTime: '17:00' };
      
      const backendData = {
        title: formData.title.trim(),
        type: formData.type || 'weekly',
        start_date: new Date(formData.startDate),
        end_date: new Date(formData.endDate),
        subjects: validSubjects.map(s => ({
          name: s.name.trim(),
          target_hours: Number(s.targetHours)
        })),
        times: {
          start: firstTimeSlot.startTime || '09:00',
          end: firstTimeSlot.endTime || '17:00'
        },
        days_of_week: formData.studyTimeSlots.map(slot => slot.day?.toLowerCase() || 'monday')
      };

      let routineId;
      if (editingRoutine) {
        const response = await routinesAPI.update(editingRoutine._id, backendData);
        routineId = editingRoutine._id;
      } else {
        const response = await routinesAPI.create(backendData);
        routineId = response.data.routine._id;
      }

      // ✅ FIXED: Upload PDFs to subjects in the database
      const subjectsWithPDFs = formData.subjects.filter(s => s.pdf);
      if (subjectsWithPDFs.length > 0 && routineId) {
        console.log(`📎 Uploading ${subjectsWithPDFs.length} PDFs to database...`);
        
        for (let i = 0; i < formData.subjects.length; i++) {
          const subject = formData.subjects[i];
          if (subject.pdf) {
            try {
              const pdfFormData = new FormData();
              pdfFormData.append('pdf', subject.pdf);
              pdfFormData.append('subject_name', subject.name);
              
              await routinesAPI.uploadSubjectPDF(routineId, pdfFormData);
              console.log(`✅ Uploaded PDF for ${subject.name}`);
            } catch (pdfError) {
              console.error(`❌ Failed to upload PDF for ${subject.name}:`, pdfError);
              alert(`Warning: Failed to upload PDF for ${subject.name}. You can upload it later.`);
            }
          }
        }
      }

      setShowCreateForm(false);
      setEditingRoutine(null);
      resetForm();
      onRoutineCreated(); // Refresh routines list
      alert('Routine saved successfully!');

    } catch (error) {
      console.error('❌ Error saving routine:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save routine';
      alert('Error: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (routineId) => {
    if (!window.confirm('Are you sure you want to delete this routine?')) return;

    try {
      await routinesAPI.delete(routineId);
      onRoutineCreated();
      alert('Routine deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting routine:', error);
      alert('Failed to delete routine');
    }
  };

  const handleEdit = (routine) => {
    setEditingRoutine(routine);
    
    const timesData = routine.times || {};
    const daysOfWeek = routine.days_of_week || [];
    
    const studyTimeSlots = daysOfWeek.length > 0 
      ? daysOfWeek.map(day => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          startTime: timesData.start || '09:00',
          endTime: timesData.end || '17:00'
        }))
      : [{ day: 'Monday', startTime: timesData.start || '09:00', endTime: timesData.end || '17:00' }];

    setFormData({
      title: routine.title,
      type: routine.type,
      startDate: routine.start_date ? routine.start_date.split('T')[0] : '',
      endDate: routine.end_date ? routine.end_date.split('T')[0] : '',
      subjects: (routine.subjects || []).map(s => ({
        name: s.name,
        targetHours: s.target_hours || 1,
        pdf: null,
        pdfName: s.pdf_name || ''
      })),
      studyTimeSlots: studyTimeSlots
    });
    
    setShowCreateForm(true);
  };

  const resetForm = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      title: '',
      type: 'weekly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: tomorrow.toISOString().split('T')[0],
      subjects: [{ name: '', targetHours: 1, pdf: null, pdfName: '' }],
      studyTimeSlots: [{ day: 'Monday', startTime: '09:00', endTime: '11:00' }]
    });
  };

  // ✅ FIXED: Upload PDF to database immediately (not just for session)
  const handlePDFUploadForSubject = async (routineId, subjectName, file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('PDF file must be less than 10MB');
      return;
    }

    setUploadingPDF(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('subject_name', subjectName);

      console.log(`📤 Uploading PDF for ${subjectName} in routine ${routineId}`);
      await routinesAPI.uploadSubjectPDF(routineId, formData);
      
      console.log('✅ PDF uploaded successfully to database');
      alert(`PDF uploaded successfully for ${subjectName}!`);
      
      // Refresh routines to show updated PDF status
      onRoutineCreated();
      
      // Re-select the routine to show updated data
      const updatedRoutineResponse = await routinesAPI.getById(routineId);
      setSelectedRoutine(updatedRoutineResponse.data.routine || updatedRoutineResponse.data);
      
    } catch (error) {
      console.error('❌ Error uploading PDF:', error);
      alert(`Failed to upload PDF: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploadingPDF(false);
    }
  };

  const handleStartSession = () => {
    console.log('🚀 Starting session with:', { 
      selectedSubject, 
      routine: selectedRoutine?.title 
    });

    if (!selectedSubject) {
      alert('Please select a subject');
      return;
    }

    // Check if subject has PDF
    const subjectHasPDF = selectedSubject.pdf_path || 
                          selectedSubject.pdf_name || 
                          selectedSubject.pdf_url ||
                          selectedSubject.has_pdf;

    if (!subjectHasPDF) {
      alert(`Please upload a PDF for "${selectedSubject.name}" before starting the session.`);
      console.warn('⚠️ No PDF available for subject:', selectedSubject.name);
      return;
    }

    console.log('✅ PDF validation passed');

    const sessionData = {
      ...selectedSubject,
      pdf_path: selectedSubject.pdf_path ? normalizePath(selectedSubject.pdf_path) : null,
      pdf_url: selectedSubject.pdf_url ? normalizePath(selectedSubject.pdf_url) : null
    };

    console.log('📤 Starting session with data:', sessionData);
    onStartSession(selectedRoutine, sessionData);
  };

  // [REST OF THE COMPONENT CODE - CREATE FORM, SUBJECT SELECTION, LIST VIEW]
  // ... (keeping all the JSX rendering code the same)

  if (routines === undefined || routines === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800 mb-8">
            ← Back to Dashboard
          </button>
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <AlertCircle className="h-24 w-24 text-red-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Unable to Load Routines</h2>
            <p className="text-gray-600 mb-6">
              There was an error loading your study routines. Please check your connection and try again.
            </p>
            <button
              onClick={() => {
                onRoutineCreated();
                onBack();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg inline-flex items-center transition-colors"
            >
              Refresh & Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">
                {editingRoutine ? 'Edit Routine' : 'Create Study Routine'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRoutine(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Routine Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Weekly Study Plan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    min={formData.startDate}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Subjects */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">Subjects & Target Hours *</label>
                  <button
                    type="button"
                    onClick={addSubject}
                    className="flex items-center text-green-600 hover:text-green-700 text-sm transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Subject
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.subjects.map((subject, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="text"
                          value={subject.name}
                          onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                          placeholder="Subject name (e.g., Mathematics)"
                          required
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          value={subject.targetHours}
                          onChange={(e) => handleSubjectChange(index, 'targetHours', parseFloat(e.target.value) || 1)}
                          placeholder="Hours"
                          min="0.5"
                          step="0.5"
                          required
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        {formData.subjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSubject(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove subject"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {/* PDF Upload */}
                      <div className="mt-2">
                        {!subject.pdf && !subject.pdfName ? (
                          <label className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-green-50 border-2 border-dashed border-gray-300 hover:border-green-400 rounded-lg cursor-pointer transition-all">
                            <Paperclip className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Attach study material PDF (optional)</span>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => handleSubjectPDFUpload(index, e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="flex items-center justify-between px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <File className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-700 font-medium">
                                {subject.pdfName || subject.pdf?.name}
                              </span>
                              {subject.pdf && (
                                <span className="text-xs text-green-600">
                                  ({(subject.pdf.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSubjectPDF(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                              title="Remove PDF"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1 ml-1">Max file size: 10MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Study Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">Study Time Slots *</label>
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="flex items-center text-green-600 hover:text-green-700 text-sm transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Slot
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.studyTimeSlots.map((slot, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <select
                        value={slot.day}
                        onChange={(e) => handleTimeSlotChange(index, 'day', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        {daysOfWeek.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      {formData.studyTimeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingRoutine(null);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {editingRoutine ? 'Update Routine' : 'Create Routine'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Subject Selection View
  if (selectedRoutine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">{selectedRoutine.title}</h2>
              <button
                onClick={() => {
                  setSelectedRoutine(null);
                  setSelectedSubject(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Select Subject to Study</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedRoutine.subjects || []).map((subject, index) => {
                  const hasPDF = subject.pdf_path || subject.has_pdf || subject.pdf_url;
                  
                  return (
                    <div
                      key={index}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        selectedSubject?.name === subject.name
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedSubject(subject)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-gray-800">{subject.name}</h4>
                          <BookOpen className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>{subject.actual_hours || 0}/{subject.target_hours || 0}h</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(((subject.actual_hours || 0) / (subject.target_hours || 1)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                        
                        {/* PDF Status Badge */}
                        {hasPDF ? (
                          <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            <Check className="h-3 w-3 mr-1" />
                            PDF Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            No PDF - Upload below
                          </span>
                        )}
                      </button>
                      
                      {/* ✅ FIXED: Upload directly to database */}
                      {selectedSubject?.name === subject.name && !hasPDF && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  handlePDFUploadForSubject(selectedRoutine._id, subject.name, e.target.files[0]);
                                }
                              }}
                              disabled={uploadingPDF}
                              className="hidden"
                            />
                            <div className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 border-dashed transition-all ${
                              uploadingPDF
                                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                                : 'bg-white border-green-300 hover:bg-green-50 hover:border-green-400'
                            }`}>
                              {uploadingPDF ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent"></div>
                                  <span className="text-sm text-gray-600">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">Upload PDF to Database</span>
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleStartSession}
              disabled={!selectedSubject}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl flex items-center justify-center text-lg font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <PlayCircle className="h-6 w-6 mr-2" />
              Start Study Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Study Plans</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Routine
          </button>
        </div>

        {safeRoutines.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Calendar className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Study Routines Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first study routine to start organizing your learning journey
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg inline-flex items-center transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Study Routine
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {safeRoutines.map((routine) => (
              <div
                key={routine._id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{routine.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {routine.type}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {routine.start_date && new Date(routine.start_date).toLocaleDateString()} - {routine.end_date && new Date(routine.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(routine)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit routine"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(routine._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete routine"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {(routine.subjects || []).map((subject, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">{subject.name}</span>
                        <span className="text-gray-600">
                          {subject.actual_hours || 0}/{subject.target_hours || 0}h
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-green-600 h-2.5 rounded-full transition-all"
                          style={{
                            width: `${Math.min(((subject.actual_hours || 0) / (subject.target_hours || 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Study Schedule</h4>
                  <div className="space-y-1">
                    {routine.days_of_week && routine.days_of_week.length > 0 ? (
                      routine.days_of_week.map((day, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-green-600" />
                          {day.charAt(0).toUpperCase() + day.slice(1)}: {routine.times?.start || '09:00'} - {routine.times?.end || '17:00'}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center text-sm text-gray-500 italic">
                        <Clock className="h-4 w-4 mr-2" />
                        No schedule set
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRoutine(routine)}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center transition-colors"
                >
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Start Session
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlan;