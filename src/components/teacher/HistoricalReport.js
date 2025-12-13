// frontend/src/components/teacher/HistoricalReport.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react';

const HistoricalReport = ({ room }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetchSessions();
  }, [room._id]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/rooms/${room._id}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions(res.data.sessions);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadPDF = async (sessionId, pdfName) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/rooms/${room._id}/history/${sessionId}/pdf`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', pdfName || `Session-${sessionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const getPresenceColor = (presence) => {
    if (presence === 'Present') return 'text-green-600 font-semibold';
    if (presence === 'Absent') return 'text-red-600 font-semibold';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white shadow rounded p-4">
      <h3 className="text-xl font-bold mb-4">Historical Sessions</h3>

      {sessions.length === 0 ? (
        <p className="text-gray-500">No past sessions available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Date</th>
                <th className="border px-3 py-2">Duration (min)</th>
                <th className="border px-3 py-2">Students Present</th>
                <th className="border px-3 py-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{new Date(s.start_time).toLocaleString()}</td>
                  <td className="border px-3 py-2">{s.duration}</td>
                  <td className="border px-3 py-2">
                    {s.students_present}/{s.total_students}{' '}
                    <span className={getPresenceColor(s.overall_presence)}>
                      ({s.overall_presence || 'Unknown'})
                    </span>
                  </td>
                  <td className="border px-3 py-2 text-center">
                    {s.pdf_name ? (
                      <button
                        onClick={() => downloadPDF(s._id, s.pdf_name)}
                        className="flex items-center justify-center space-x-1 px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Download</span>
                      </button>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoricalReport;
