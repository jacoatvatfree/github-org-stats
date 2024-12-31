import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function BurnupChart({ monthlyStats = [] }) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const currentMonth = new Date().getMonth();
  const labels = months.slice(0, currentMonth + 1);

  // Ensure we have data and it's an array
  const validStats = Array.isArray(monthlyStats) ? monthlyStats : Array(12).fill({ opened: 0, closed: 0, total: 0 });
  const currentStats = validStats.slice(0, currentMonth + 1);

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Open Issues',
        data: currentStats.map(stat => stat?.total ?? 0),
        borderColor: 'rgb(176, 24, 103)', // primary color
        backgroundColor: 'rgba(176, 24, 103, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Opened Issues',
        data: currentStats.map(stat => stat?.opened ?? 0),
        borderColor: 'rgb(0, 105, 179)', // secondary color
        backgroundColor: 'rgba(0, 105, 179, 0.5)',
        borderDash: [5, 5]
      },
      {
        label: 'Closed Issues',
        data: currentStats.map(stat => stat?.closed ?? 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderDash: [5, 5]
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Issues Burnup Chart'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Issues'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Month'
        }
      }
    }
  };

  return (
    <div className="h-[300px]">
      <Line options={options} data={data} />
    </div>
  );
}
