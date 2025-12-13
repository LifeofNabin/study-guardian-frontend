// frontend/src/components/teacher/TeacherDashboard.js
// ✅ COMPLETE VERSION: Teacher profile display + All previous features

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, roomsAPI } from '../../services/api'; 
import { Users, Plus, UserPlus, Upload, Edit, Trash2, Monitor, LogOut, BookOpen, Clock, Settings, Bell } from 'lucide-react';
import RoomCreation from './RoomCreation';
import LiveMetrics from './LiveMetrics';
import AddStudentModal from './AddStudentModal';
import UploadPDFModal from './UploadPDFModal';
import DeleteConfirmModal from './DeleteConfirmModal';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showUploadPDFModal, setShowUploadPDFModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchRooms();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/login');
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await roomsAPI.getAll();
      const roomsArray = Array.isArray(response.data) ? response.data : response.data.rooms || [];
      setRooms(roomsArray);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      console.warn('Backend logout failed or error:', error);
    } finally {
      localStorage.removeItem('token'); 
      localStorage.removeItem('refreshToken');
      navigate('/login'); 
    }
  };

  const handleRoomCreated = (newRoom) => {
    setRooms(prev => [newRoom, ...prev]);
    setShowCreateForm(false);
  };

  const handleRoomUpdated = (updatedRoom) => {
    setRooms(prev => prev.map(room => 
      room._id === updatedRoom._id ? { ...room, ...updatedRoom } : room
    ));
    setShowEditModal(false);
    setActiveRoom(null);
  };

  const handleStudentAdded = (roomId, studentEmail) => {
    fetchRooms();
  };

  const handlePDFUploaded = (roomId, filename) => {
    fetchRooms();
  };

  const handleRoomDeleted = (roomId) => {
    setRooms(prev => prev.filter(r => r._id !== roomId));
    setShowDeleteModal(false);
    setActiveRoom(null);
  };

  const handleCloseCreateForm = () => setShowCreateForm(false);
  const handleMonitor = (room) => setSelectedRoom(room);

  const handleAddStudent = (room) => {
    setActiveRoom(room);
    setShowAddStudentModal(true);
  };

  const handleUploadPdf = (room) => {
    setActiveRoom(room);
    setShowUploadPDFModal(true);
  };

  const handleEdit = (room) => {
    setActiveRoom(room);
    setShowEditModal(true);
  };

  const handleDelete = (room) => {
    setActiveRoom(room);
    setShowDeleteModal(true);
  };

  const onBack = () => setSelectedRoom(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return <RoomCreation onClose={handleCloseCreateForm} onRoomCreated={handleRoomCreated} />;
  }

  if (showEditModal && activeRoom) {
    return (
      <RoomCreation 
        editRoom={activeRoom} 
        onClose={() => {
          setShowEditModal(false);
          setActiveRoom(null);
        }} 
        onRoomCreated={handleRoomUpdated} 
      />
    );
  }

  if (selectedRoom) {
    return <LiveMetrics room={selectedRoom} onBack={onBack} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* ✅ Header with User Profile */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 rounded-xl">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">StudyGuardian</h1>
              <p className="text-xs text-gray-500">Teacher Dashboard</p>
            </div>
          </div>

          {/* Right Section: User Profile + Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings */}
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>

            {/* ✅ User Profile Display */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user?.name || 'Teacher'}</p>
                <p className="text-xs text-gray-500">Teacher</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'T'}
              </div>
            </div>

            {/* ✅ Logout Button */}
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 rounded-full text-red-600 transition-colors" 
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
              <p className="text-purple-100">Manage your classrooms and monitor student progress</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{rooms.length}</p>
              <p className="text-sm text-purple-100">Active Rooms</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Rooms</p>
                <p className="text-3xl font-bold text-gray-800">{rooms.length}</p>
              </div>
              <BookOpen className="h-12 w-12 text-purple-500 opacity-80" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-gray-800">
                  {rooms.reduce((sum, room) => sum + (room.allowed_students?.length || 0), 0)}
                </p>
              </div>
              <Users className="h-12 w-12 text-green-500 opacity-80" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Rooms</p>
                <p className="text-3xl font-bold text-gray-800">
                  {rooms.filter(room => room.is_active).length}
                </p>
              </div>
              <Monitor className="h-12 w-12 text-blue-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">My Classrooms</h3>
            <p className="text-gray-600 mt-1">Manage and monitor your study rooms</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg text-white px-6 py-3 rounded-xl flex items-center transition-all font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" /> Create New Room
          </button>
        </div>

        {/* Rooms Grid or Empty State */}
        {(!rooms || rooms.length === 0) ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Users className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Classrooms Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first classroom to start monitoring students
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg text-white px-8 py-3 rounded-xl inline-flex items-center transition-all font-semibold"
            >
              <Plus className="h-5 w-5 mr-2" /> Create Classroom
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div 
                key={room._id} 
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-gray-100 overflow-hidden flex flex-col"
              >
                {/* Room Header */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-5 text-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">📚</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      room.is_active 
                        ? 'bg-green-500 bg-opacity-30 text-green-100' 
                        : 'bg-red-500 bg-opacity-30 text-red-100'
                    }`}>
                      {room.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-1">{room.title}</h3>
                  <p className="text-purple-100 text-sm">Subject: {room.subject || 'Not specified'}</p>
                </div>

                {/* Room Info */}
                <div className="p-5 flex-grow flex flex-col">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Room Code:</span>
                      <span className="font-bold text-purple-600 text-lg tracking-wider">{room.code}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Students:</span>
                      <span className="font-semibold text-gray-800">
                        {room.allowed_students?.length || 0}/{room.max_students || 20}
                      </span>
                    </div>
                    
                    {/* ✅ PDF Status Indicator */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">PDF Status:</span>
                      {room.has_pdf ? (
                        <span className="font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-md flex items-center gap-1.5 text-xs">
                          <Upload className="w-3.5 h-3.5" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1.5 text-xs">
                          Not Uploaded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 mt-auto">
                    <button
                      onClick={() => handleMonitor(room)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Monitor className="w-4 h-4" />
                      Monitor Room
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAddStudent(room)}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5 text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Student
                      </button>
                      
                      {/* ✅ Dynamic Upload/Manage Button */}
                      <button
                        onClick={() => handleUploadPdf(room)}
                        className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-sm ${
                          room.has_pdf
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        <Upload className="w-4 h-4" />
                        {room.has_pdf ? 'Manage PDF' : 'Upload PDF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEdit(room)}
                        className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg font-medium hover:bg-orange-100 transition-all flex items-center justify-center gap-1.5 text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        className="px-3 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-1.5 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddStudentModal && activeRoom && (
        <AddStudentModal
          room={activeRoom}
          onClose={() => {
            setShowAddStudentModal(false);
            setActiveRoom(null);
          }}
          onStudentAdded={handleStudentAdded}
        />
      )}

      {showUploadPDFModal && activeRoom && (
        <UploadPDFModal
          room={activeRoom}
          onClose={() => {
            setShowUploadPDFModal(false);
            setActiveRoom(null);
          }}
          onPDFUploaded={handlePDFUploaded}
        />
      )}

      {showDeleteModal && activeRoom && (
        <DeleteConfirmModal
          room={activeRoom}
          onClose={() => {
            setShowDeleteModal(false);
            setActiveRoom(null);
          }}
          onConfirm={handleRoomDeleted}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;