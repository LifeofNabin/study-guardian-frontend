import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { roomsAPI } from '../../services/api';

const DeleteConfirmModal = ({ room, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    // Optional: Require typing room name for extra safety
    // if (confirmText !== room.title) {
    //   setError('Room title does not match. Please type the exact room title.');
    //   return;
    // }

    setLoading(true);
    setError('');

    try {
      await roomsAPI.delete(room._id);
      
      // Notify parent component
      if (onConfirm) {
        onConfirm(room._id);
      }
      
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header with Warning Icon */}
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 p-4 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Delete Room?
          </h2>
          
          <p className="text-center text-gray-600 mb-4">
            Are you sure you want to delete this room?
          </p>

          {/* Room Details */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Room Title:</span>
                <span className="font-semibold text-gray-800">{room.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subject:</span>
                <span className="font-semibold text-gray-800">{room.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room Code:</span>
                <span className="font-semibold text-purple-600">{room.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Students:</span>
                <span className="font-semibold text-gray-800">
                  {room.allowed_students?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Warning:</strong> This action cannot be undone. All room data, including student records and uploaded materials, will be permanently deleted.
              </span>
            </p>
          </div>

          {/* Optional: Confirmation Input */}
          {/* Uncomment below if you want users to type the room name for extra confirmation */}
          {/*
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">{room.title}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError('');
              }}
              placeholder="Enter room title"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
            />
          </div>
          */}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Delete Room
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;