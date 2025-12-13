import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PomodoroTimer = ({ onTimerComplete, embedded = false }) => {
  const [timerState, setTimerState] = useState('idle'); // idle, work, shortBreak, longBreak
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [settings, setSettings] = useState({
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    pomodorosUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Load user preferences
  useEffect(() => {
    fetchUserPreferences();
    
    // Initialize audio
    audioRef.current = new Audio();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/preferences/study/pomodoro`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const prefs = response.data.data;
        setSettings({
          workDuration: Math.floor(prefs.workDuration / 60000),
          shortBreak: Math.floor(prefs.shortBreak / 60000),
          longBreak: Math.floor(prefs.longBreak / 60000),
          pomodorosUntilLongBreak: 4,
          autoStartBreaks: false,
          autoStartPomodoros: false,
          soundEnabled: true
        });
        setTimeRemaining(Math.floor(prefs.workDuration / 1000));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const savePreferences = async (newSettings) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.put(
        `${API_URL}/api/preferences/study/pomodoro`,
        {
          enabled: true,
          work_duration: newSettings.workDuration,
          short_break: newSettings.shortBreak,
          long_break: newSettings.longBreak
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Timer logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    playSound();
    
    if (timerState === 'work') {
      const newCompleted = completedPomodoros + 1;
      setCompletedPomodoros(newCompleted);
      
      // Determine next break type
      if (newCompleted % settings.pomodorosUntilLongBreak === 0) {
        if (settings.autoStartBreaks) {
          startLongBreak();
        } else {
          setTimerState('idle');
          setTimeRemaining(settings.workDuration * 60);
          showNotification('Long Break Time!', 'Great job! Take a long break.');
        }
      } else {
        if (settings.autoStartBreaks) {
          startShortBreak();
        } else {
          setTimerState('idle');
          setTimeRemaining(settings.workDuration * 60);
          showNotification('Short Break Time!', 'Take a short break.');
        }
      }
      
      if (onTimerComplete) {
        onTimerComplete('work');
      }
    } else {
      // Break completed
      if (settings.autoStartPomodoros) {
        startWork();
      } else {
        setTimerState('idle');
        setTimeRemaining(settings.workDuration * 60);
        showNotification('Break Over!', 'Ready to start a new pomodoro?');
      }
      
      if (onTimerComplete) {
        onTimerComplete('break');
      }
    }
  }, [timerState, completedPomodoros, settings, onTimerComplete]);

  const startWork = () => {
    setTimerState('work');
    setTimeRemaining(settings.workDuration * 60);
    setIsRunning(true);
  };

  const startShortBreak = () => {
    setTimerState('shortBreak');
    setTimeRemaining(settings.shortBreak * 60);
    setIsRunning(true);
  };

  const startLongBreak = () => {
    setTimerState('longBreak');
    setTimeRemaining(settings.longBreak * 60);
    setIsRunning(true);
  };

  const toggleTimer = () => {
    if (timerState === 'idle') {
      startWork();
    } else {
      setIsRunning(!isRunning);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimerState('idle');
    setTimeRemaining(settings.workDuration * 60);
  };

  const skipTimer = () => {
    handleTimerComplete();
  };

  const playSound = () => {
    if (!settings.soundEnabled) return;
    
    try {
      // Simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    let totalDuration;
    if (timerState === 'work') {
      totalDuration = settings.workDuration * 60;
    } else if (timerState === 'shortBreak') {
      totalDuration = settings.shortBreak * 60;
    } else if (timerState === 'longBreak') {
      totalDuration = settings.longBreak * 60;
    } else {
      totalDuration = settings.workDuration * 60;
    }
    return ((totalDuration - timeRemaining) / totalDuration) * 100;
  };

  const getTimerColor = () => {
    switch (timerState) {
      case 'work':
        return 'from-red-500 to-pink-600';
      case 'shortBreak':
        return 'from-green-500 to-emerald-600';
      case 'longBreak':
        return 'from-blue-500 to-indigo-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTimerLabel = () => {
    switch (timerState) {
      case 'work':
        return '🍅 Focus Time';
      case 'shortBreak':
        return '☕ Short Break';
      case 'longBreak':
        return '🌟 Long Break';
      default:
        return '⏱️ Ready to Start';
    }
  };

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    savePreferences(newSettings);
    
    // Update current timer if idle
    if (timerState === 'idle') {
      setTimeRemaining(newSettings.workDuration * 60);
    }
  };

  if (embedded) {
    // Compact embedded view
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-500">{getTimerLabel()}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isRunning ? '⏸️ Pause' : '▶️ Start'}
            </button>
            {timerState !== 'idle' && (
              <button
                onClick={resetTimer}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                🔄 Reset
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getTimerColor()} transition-all duration-1000`}
            style={{ width: `${getProgress()}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // Full standalone view
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🍅 Pomodoro Timer</h1>
          <p className="text-gray-600">Stay focused and productive with the Pomodoro Technique</p>
        </div>

        {/* Main Timer Card */}
        <div className={`bg-gradient-to-br ${getTimerColor()} rounded-3xl p-12 text-white shadow-2xl mb-6`}>
          {/* Timer State Label */}
          <div className="text-center mb-8">
            <div className="text-2xl font-semibold opacity-90">{getTimerLabel()}</div>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-8xl font-bold mb-4 tracking-tight">
              {formatTime(timeRemaining)}
            </div>
            
            {/* Progress Circle */}
            <div className="relative inline-block">
              <svg className="transform -rotate-90" width="200" height="200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (1 - getProgress() / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl font-bold">{Math.round(getProgress())}%</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleTimer}
              className="px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              {isRunning ? '⏸️ Pause' : timerState === 'idle' ? '▶️ Start' : '▶️ Resume'}
            </button>
            
            {timerState !== 'idle' && (
              <>
                <button
                  onClick={resetTimer}
                  className="px-6 py-4 bg-white/20 backdrop-blur hover:bg-white/30 rounded-full font-semibold transition-colors"
                >
                  🔄 Reset
                </button>
                <button
                  onClick={skipTimer}
                  className="px-6 py-4 bg-white/20 backdrop-blur hover:bg-white/30 rounded-full font-semibold transition-colors"
                >
                  ⏭️ Skip
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pomodoro Counter */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Completed Pomodoros</h3>
            <span className="text-2xl font-bold text-red-500">{completedPomodoros}</span>
          </div>
          <div className="flex gap-2">
            {[...Array(settings.pomodorosUntilLongBreak)].map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-3 rounded-full ${
                  index < completedPomodoros % settings.pomodorosUntilLongBreak
                    ? 'bg-red-500'
                    : 'bg-gray-200'
                }`}
              ></div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {settings.pomodorosUntilLongBreak - (completedPomodoros % settings.pomodorosUntilLongBreak)} more until long break
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={startWork}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">🍅</div>
            <div className="font-semibold text-gray-900">Work</div>
            <div className="text-sm text-gray-500">{settings.workDuration} min</div>
          </button>
          <button
            onClick={startShortBreak}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">☕</div>
            <div className="font-semibold text-gray-900">Short Break</div>
            <div className="text-sm text-gray-500">{settings.shortBreak} min</div>
          </button>
          <button
            onClick={startLongBreak}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">🌟</div>
            <div className="font-semibold text-gray-900">Long Break</div>
            <div className="text-sm text-gray-500">{settings.longBreak} min</div>
          </button>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <span className="font-semibold text-gray-900">⚙️ Settings</span>
          <span className={`transform transition-transform ${showSettings ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Timer Settings</h3>
            
            <div className="space-y-6">
              {/* Duration Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.workDuration}
                  onChange={(e) => updateSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.shortBreak}
                  onChange={(e) => updateSettings({ ...settings, shortBreak: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Long Break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.longBreak}
                  onChange={(e) => updateSettings({ ...settings, longBreak: parseInt(e.target.value) || 15 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pomodoros until long break
                </label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={settings.pomodorosUntilLongBreak}
                  onChange={(e) => updateSettings({ ...settings, pomodorosUntilLongBreak: parseInt(e.target.value) || 4 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Toggle Settings */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Auto-start breaks</label>
                  <button
                    onClick={() => updateSettings({ ...settings, autoStartBreaks: !settings.autoStartBreaks })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.autoStartBreaks ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.autoStartBreaks ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Auto-start pomodoros</label>
                  <button
                    onClick={() => updateSettings({ ...settings, autoStartPomodoros: !settings.autoStartPomodoros })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.autoStartPomodoros ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.autoStartPomodoros ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Sound notifications</label>
                  <button
                    onClick={() => updateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.soundEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Notification Permission */}
              {'Notification' in window && Notification.permission === 'default' && (
                <button
                  onClick={requestNotificationPermission}
                  className="w-full mt-4 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  🔔 Enable Notifications
                </button>
              )}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 rounded-2xl p-6 mt-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Pomodoro Technique Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Work in focused 25-minute intervals</li>
            <li>• Take short breaks to recharge (5 minutes)</li>
            <li>• After 4 pomodoros, take a longer break (15 minutes)</li>
            <li>• Eliminate distractions during work time</li>
            <li>• Use breaks to stretch, hydrate, or rest your eyes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;