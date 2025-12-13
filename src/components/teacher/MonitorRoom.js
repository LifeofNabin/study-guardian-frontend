// frontend/src/components/teacher/MonitorRoom.js
import React, { useState } from 'react';
import LiveMetrics from './LiveMetrics';
import HistoricalReport from './HistoricalReport';

const MonitorRoom = ({ room, onBack }) => {
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'history'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <button
        className="mb-4 px-4 py-2 bg-purple-600 text-white rounded"
        onClick={onBack}
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold mb-4">{room.title} - Monitor</h2>

      {/* Tabs */}
      <div className="mb-4 flex gap-4">
        <button
          className={`px-4 py-2 rounded ${activeTab==='live'?'bg-purple-600 text-white':'bg-gray-200'}`}
          onClick={() => setActiveTab('live')}
        >
          Live Metrics
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab==='history'?'bg-purple-600 text-white':'bg-gray-200'}`}
          onClick={() => setActiveTab('history')}
        >
          Historical Report
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'live' && <LiveMetrics room={room} onBack={onBack} />}
      {activeTab === 'history' && <HistoricalReport room={room} />}
    </div>
  );
};

export default MonitorRoom;
