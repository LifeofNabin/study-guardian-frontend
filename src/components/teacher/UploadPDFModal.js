import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle } from 'lucide-react';
import { roomsAPI } from '../../services/api';

const UploadPDFModal = ({ room, onClose, onPDFUploaded }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');

    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      e.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // Backend expects 'pdf' field name (from req.files.pdf)
      formData.append('pdf', file);
      
      // Debug: Log what we're sending
      console.log('📤 Uploading file:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        roomId: room._id
      });
      
      // Log FormData contents
      for (let pair of formData.entries()) {
        console.log('FormData entry:', pair[0], pair[1]);
      }

      // ✅ FIXED: Removed the third parameter that was causing the issue
      const response = await roomsAPI.uploadPDF(room._id, formData);

      setSuccess(true);
      
      // Notify parent component
      if (onPDFUploaded) {
        onPDFUploaded(room._id, file.name);
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // More detailed error message
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to upload PDF. Please try again.';
      
      setError(`Upload failed: ${errorMessage}`);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    setUploadProgress(0);
    const input = document.getElementById('pdf-upload-input');
    if (input) input.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Upload Study Material</h2>
                <p className="text-purple-100 text-sm mt-1">{room.title}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <span>PDF uploaded successfully!</span>
            </div>
          )}

          {/* File Upload Area */}
          <label 
            htmlFor="pdf-upload-input"
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              file 
                ? 'border-purple-400 bg-purple-50' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {file ? (
              <div className="text-center p-4">
                <FileText className="w-16 h-16 text-purple-600 mx-auto mb-3" />
                <p className="text-sm text-gray-700 font-medium mb-1">{file.name}</p>
                <p className="text-xs text-gray-500 mb-3">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                {loading && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-purple-600 font-medium">
                      Uploading...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PDF only (max 10MB)</p>
              </div>
            )}
            <input
              id="pdf-upload-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading || success}
            />
          </label>

          {file && !loading && !success && (
            <button
              type="button"
              onClick={removeFile}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
            >
              <X className="w-4 h-4" /> Remove file
            </button>
          )}

          {/* Current PDF Info */}
          {room.has_pdf && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">⚠ Current PDF:</span> {room.pdf_name || 'Existing file'}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Uploading a new file will replace the existing one.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file || success}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Uploaded
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload PDF
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPDFModal;