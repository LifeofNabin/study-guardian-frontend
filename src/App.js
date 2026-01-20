import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Teacher components
import TeacherDashboard from './components/teacher/TeacherDashboard';

// Student components
import StudentDashboard from './components/student/StudentDashboard';
import AnalyticsDashboard from './components/student/AnalyticsDashboard'; // Add this import
import StudySession from './components/student/StudySession'; // If you have this

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  console.log('🔒 ProtectedRoute check:', { token: !!token, userRole, requiredRole });
  
  if (!token) {
    console.log('❌ No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    console.log('❌ Wrong role, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Access granted');
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Teacher routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Student routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Analytics route */}
        <Route
          path="/student/analytics"
          element={
            <ProtectedRoute requiredRole="student">
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Study session route */}
        <Route
          path="/student/session/:roomId?/:routineId?"
          element={
            <ProtectedRoute requiredRole="student">
              <StudySession />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;