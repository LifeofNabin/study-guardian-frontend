// frontend/src/components/shared/Charts.js
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ==================== ENGAGEMENT SCORE CHART ====================
export const EngagementChart = ({ data, height = 300 }) => {
  const chartData = {
    labels: data.map((d, i) => `${i + 1}m`),
    datasets: [
      {
        label: 'Engagement Score',
        data: data.map(d => d.score),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => `Score: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

// ==================== BLINK RATE CHART ====================
export const BlinkRateChart = ({ data, height = 250 }) => {
  const chartData = {
    labels: data.map((d, i) => `${i + 1}m`),
    datasets: [
      {
        label: 'Blink Rate (per min)',
        data: data.map(d => d.blinkRate),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Normal Range',
        data: Array(data.length).fill(15),
        borderColor: 'rgba(156, 163, 175, 0.5)',
        borderDash: [5, 5],
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 0) {
              const value = context.parsed.y;
              let status = 'Normal';
              if (value < 10) status = 'Low (Tired)';
              if (value > 25) status = 'High (Stressed)';
              return `Blink Rate: ${value}/min (${status})`;
            }
            return 'Normal: 15/min';
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 40,
        ticks: {
          callback: (value) => `${value}/min`
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

// ==================== POSTURE QUALITY CHART ====================
export const PostureChart = ({ data, height = 250 }) => {
  const chartData = {
    labels: data.map((d, i) => `${i + 1}m`),
    datasets: [
      {
        label: 'Posture Score',
        data: data.map(d => d.postureScore),
        backgroundColor: data.map(d => {
          if (d.postureScore >= 80) return 'rgba(34, 197, 94, 0.7)';
          if (d.postureScore >= 60) return 'rgba(251, 191, 36, 0.7)';
          return 'rgba(239, 68, 68, 0.7)';
        }),
        borderColor: data.map(d => {
          if (d.postureScore >= 80) return 'rgb(34, 197, 94)';
          if (d.postureScore >= 60) return 'rgb(251, 191, 36)';
          return 'rgb(239, 68, 68)';
        }),
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            let status = 'Poor';
            if (value >= 80) status = 'Excellent';
            else if (value >= 60) status = 'Good';
            return `Posture: ${value}% (${status})`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// ==================== TIME DISTRIBUTION PIE CHART ====================
export const TimeDistributionChart = ({ data, height = 300 }) => {
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Blue
          'rgba(34, 197, 94, 0.8)',    // Green
          'rgba(251, 191, 36, 0.8)',   // Yellow
          'rgba(239, 68, 68, 0.8)',    // Red
          'rgba(168, 85, 247, 0.8)',   // Purple
          'rgba(236, 72, 153, 0.8)'    // Pink
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)'
        ],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} min (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

// ==================== PAGE HEAT MAP ====================
export const PageHeatMap = ({ data, height = 300 }) => {
  // Sort by time spent
  const sortedData = [...data].sort((a, b) => b.timeSpent - a.timeSpent);
  
  const chartData = {
    labels: sortedData.map(d => `Page ${d.page}`),
    datasets: [
      {
        label: 'Time Spent (seconds)',
        data: sortedData.map(d => d.timeSpent),
        backgroundColor: sortedData.map(d => {
          const intensity = Math.min(d.timeSpent / 300, 1); // Normalize to 5 min max
          return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
        }),
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const seconds = context.parsed.x;
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `Time: ${minutes}m ${secs}s`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          callback: (value) => `${Math.floor(value / 60)}m`
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// ==================== EMOTION TIMELINE CHART ====================
export const EmotionChart = ({ data, height = 250 }) => {
  const emotions = ['focused', 'confused', 'happy', 'neutral', 'tired'];
  const colors = {
    focused: 'rgb(34, 197, 94)',
    confused: 'rgb(251, 191, 36)',
    happy: 'rgb(59, 130, 246)',
    neutral: 'rgb(156, 163, 175)',
    tired: 'rgb(239, 68, 68)'
  };

  const datasets = emotions.map(emotion => ({
    label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
    data: data.map(d => (d.emotion === emotion ? 1 : 0)),
    backgroundColor: colors[emotion],
    borderColor: colors[emotion],
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6
  }));

  const chartData = {
    labels: data.map((d, i) => `${i + 1}m`),
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        display: false,
        min: 0,
        max: 1.5
      }
    }
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

// ==================== COMPARATIVE BAR CHART ====================
export const ComparativeChart = ({ userStats, classAverage, height = 300 }) => {
  const metrics = Object.keys(userStats);
  
  const chartData = {
    labels: metrics.map(m => m.replace(/_/g, ' ').toUpperCase()),
    datasets: [
      {
        label: 'Your Score',
        data: metrics.map(m => userStats[m]),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2
      },
      {
        label: 'Class Average',
        data: metrics.map(m => classAverage[m]),
        backgroundColor: 'rgba(156, 163, 175, 0.6)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value}%`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// ==================== PRESENCE TIMELINE CHART ====================
export const PresenceChart = ({ data, height = 200 }) => {
  const chartData = {
    labels: data.map((d, i) => `${i + 1}m`),
    datasets: [
      {
        label: 'Present',
        data: data.map(d => (d.present ? 100 : 0)),
        backgroundColor: data.map(d => 
          d.present ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderWidth: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => 
            context.parsed.y > 0 ? 'Present' : 'Away'
        }
      }
    },
    scales: {
      y: {
        display: false
      }
    }
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// ==================== STUDY STREAK CHART ====================
export const StreakChart = ({ days, height = 200 }) => {
  const chartData = {
    labels: days.map(d => d.date),
    datasets: [
      {
        label: 'Study Minutes',
        data: days.map(d => d.minutes),
        backgroundColor: days.map(d => 
          d.minutes > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(229, 231, 235, 0.8)'
        ),
        borderColor: days.map(d => 
          d.minutes > 0 ? 'rgb(34, 197, 94)' : 'rgb(229, 231, 235)'
        ),
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === 0) return 'No study';
            const hours = Math.floor(value / 60);
            const mins = value % 60;
            return `${hours}h ${mins}m`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `${Math.floor(value / 60)}h`
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// ==================== ENGAGEMENT GAUGE (DOUGHNUT) ====================
export const EngagementGauge = ({ score, height = 250 }) => {
  const chartData = {
    labels: ['Engagement', 'Remaining'],
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [
          score >= 85 ? 'rgba(34, 197, 94, 0.8)' :
          score >= 70 ? 'rgba(59, 130, 246, 0.8)' :
          score >= 50 ? 'rgba(251, 191, 36, 0.8)' :
          'rgba(239, 68, 68, 0.8)',
          'rgba(229, 231, 235, 0.3)'
        ],
        borderWidth: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => 
            context.dataIndex === 0 ? `Engagement: ${score}%` : ''
        }
      }
    }
  };

  return (
    <div style={{ height, position: 'relative' }}>
      <Doughnut data={chartData} options={options} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score}%</div>
        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
          {score >= 85 ? 'Excellent' :
           score >= 70 ? 'Good' :
           score >= 50 ? 'Moderate' : 'Low'}
        </div>
      </div>
    </div>
  );
};

export default {
  EngagementChart,
  BlinkRateChart,
  PostureChart,
  TimeDistributionChart,
  PageHeatMap,
  EmotionChart,
  ComparativeChart,
  PresenceChart,
  StreakChart,
  EngagementGauge
};