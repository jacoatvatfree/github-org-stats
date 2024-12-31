import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export default function BurnupChart({ monthlyStats = [], fromDate, toDate }) {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);

  const labels = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    labels.push(
      currentDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
    );
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  const validStats = Array.isArray(monthlyStats)
    ? monthlyStats
    : Array(labels.length).fill({ opened: 0, closed: 0, total: 0 });

  const data = {
    labels,
    datasets: [
      {
        label: "Total Open Issues",
        data: validStats.map((stat) => stat?.total ?? 0),
        borderColor: "rgb(176, 24, 103)", // primary color
        backgroundColor: "rgba(176, 24, 103, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Opened Issues",
        data: validStats.map((stat) => stat?.opened ?? 0),
        borderColor: "rgb(0, 105, 179)", // secondary color
        backgroundColor: "rgba(0, 105, 179, 0.5)",
        borderDash: [5, 5],
      },
      {
        label: "Closed Issues",
        data: validStats.map((stat) => stat?.closed ?? 0),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderDash: [5, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of Issues",
        },
      },
      x: {
        title: {
          display: true,
          text: "Month",
        },
      },
    },
  };

  return (
    <div className="h-[300px] print:h-auto print:w-full print:max-w-full">
      <Line options={options} data={data} />
    </div>
  );
}
