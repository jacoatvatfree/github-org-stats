import { Pie } from "react-chartjs-2";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PullRequestTypeChart({ prTypeStats }) {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <Pie
        data={{
          labels: Object.entries(prTypeStats)
            .map(([type]) => type),
          datasets: [
            {
              data: Object.entries(prTypeStats)
                .map(([_, count]) => count),
              backgroundColor: [
                "#60A5FA", // blue-400
                "#34D399", // emerald-400
                "#F472B6", // pink-400
                "#A78BFA", // violet-400
                "#FBBF24", // amber-400
                "#FB7185", // rose-400
              ],
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
                usePointStyle: true,
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || "";
                  const value = context.raw || 0;
                  return `${label}: ${value} PRs`;
                },
              },
            },
          },
        }}
      />
    </div>
  );
}
