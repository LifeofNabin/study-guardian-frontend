import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { LogIn, Mail, Lock, AlertCircle, BookOpen } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const submitCountRef = useRef(0);

  // Debug: Track component lifecycle
  useEffect(() => {
    console.log('🔄 Login component mounted');
    
    // Check if we just came from a login attempt
    const lastStep = sessionStorage.getItem('loginStep');
    const lastError = sessionStorage.getItem('loginError');
    
    if (lastStep) {
      console.log('📋 Previous login step:', lastStep);
      if (lastError) {
        console.log('📋 Previous error:', lastError);
      }
    }
    
    return () => {
      console.log('🔄 Login component unmounted');
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // ✅ ADDED: Stop event bubbling
    
    submitCountRef.current += 1;
    console.log(`🎯 handleSubmit called (count: ${submitCountRef.current})`);
    
    // Add to sessionStorage to survive reloads
    sessionStorage.setItem('loginAttempt', Date.now());
    sessionStorage.setItem('loginStep', 'started');
    
    // Prevent duplicate submissions
    if (submittingRef.current) {
      console.warn('⚠️ Already submitting, ignoring duplicate call');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');

    console.log('🚀 Starting login request...');
    sessionStorage.setItem('loginStep', 'requesting');

    try {
      const response = await authAPI.login(formData);
      sessionStorage.setItem('loginStep', 'response-received');
      
      console.log('✅ Login response received:', response.data);
      console.log('🔍 Response structure:', {
        hasUser: !!response.data.user,
        hasAccessToken: !!response.data.accessToken,
        hasRefreshToken: !!response.data.refreshToken,
        accessTokenValue: response.data.accessToken,
        refreshTokenValue: response.data.refreshToken
      });
      
      const { user, accessToken, refreshToken } = response.data;

      sessionStorage.setItem('loginStep', 'saving-tokens');
      console.log('💾 About to save:', {
        token: accessToken,
        refreshToken: refreshToken,
        role: user.role
      });

      // Save to sessionStorage for debugging
      sessionStorage.setItem('lastSavedToken', accessToken || 'undefined');
      sessionStorage.setItem('lastSavedRefreshToken', refreshToken || 'undefined');
      sessionStorage.setItem('lastSavedRole', user.role || 'undefined');

      // Save tokens
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('role', user.role);

      sessionStorage.setItem('loginStep', 'tokens-saved');
      console.log('✅ Tokens saved to localStorage');
      console.log('🔍 Verify saved tokens:', {
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
        role: localStorage.getItem('role')
      });
      console.log('🧭 Navigating to:', user.role === 'teacher' ? '/teacher' : '/student');

      sessionStorage.setItem('loginStep', 'navigating');
      // Navigate based on role
      navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
      
      sessionStorage.setItem('loginStep', 'navigation-complete');
      console.log('✅ Navigation complete');
    } catch (err) {
      sessionStorage.setItem('loginStep', 'error');
      sessionStorage.setItem('loginError', err.message);
      console.error('❌ Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      submittingRef.current = false; // Reset on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <BookOpen className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to StudyGuardian</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;