import React, { useState, useEffect } from 'react';

const NotificationBanner = ({ 
  message, 
  type = 'info', // success, error, warning, info
  duration = 5000,
  onClose,
  position = 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center
  showProgress = true,
  icon = null,
  action = null
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration && duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            handleClose();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50';
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-500',
          text: 'text-green-800',
          icon: '✅',
          progressBg: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-800',
          icon: '❌',
          progressBg: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-800',
          icon: '⚠️',
          progressBg: 'bg-yellow-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          text: 'text-blue-800',
          icon: 'ℹ️',
          progressBg: 'bg-blue-500'
        };
    }
  };

  const styles = getTypeStyles();
  const displayIcon = icon || styles.icon;

  if (!isVisible) return null;

  return (
    <div
      className={`${getPositionClasses()} transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div
        className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-lg overflow-hidden max-w-md`}
      >
        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className="text-2xl flex-shrink-0">{displayIcon}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`${styles.text} text-sm font-medium break-words`}>
              {message}
            </p>
            {action && (
              <button
                onClick={action.onClick}
                className={`${styles.text} text-xs font-semibold mt-2 hover:underline`}
              >
                {action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        {showProgress && duration > 0 && (
          <div className="h-1 bg-gray-200">
            <div
              className={`h-full ${styles.progressBg} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

// Notification Manager Component
export const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for custom notification events
    const handleNotification = (event) => {
      const { message, type, duration, icon, action } = event.detail;
      addNotification({ message, type, duration, icon, action });
    };

    window.addEventListener('showNotification', handleNotification);
    return () => window.removeEventListener('showNotification', handleNotification);
  }, []);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, ...notification }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      {notifications.map((notification, index) => (
        <NotificationBanner
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          icon={notification.icon}
          action={notification.action}
          position="top-right"
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  );
};

// Helper function to show notifications from anywhere
export const showNotification = (message, type = 'info', options = {}) => {
  const event = new CustomEvent('showNotification', {
    detail: {
      message,
      type,
      duration: options.duration || 5000,
      icon: options.icon,
      action: options.action
    }
  });
  window.dispatchEvent(event);
};

// Predefined notification types
export const notify = {
  success: (message, options) => showNotification(message, 'success', options),
  error: (message, options) => showNotification(message, 'error', options),
  warning: (message, options) => showNotification(message, 'warning', options),
  info: (message, options) => showNotification(message, 'info', options)
};

export default NotificationBanner;