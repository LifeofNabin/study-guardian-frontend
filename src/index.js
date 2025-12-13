import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Remove StrictMode for production-like behavior
// StrictMode causes double-rendering in development which triggers duplicate API calls
root.render(<App />);