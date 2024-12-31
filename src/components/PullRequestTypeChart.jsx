import { Pie } from "react-chartjs-2";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PullRequestTypeChart({ prTypeStats }) {
  const total = Object.values(prTypeStats).reduce(
    (sum, count) => sum + count,
    0,
  );
  const threshold = total * 0.02; // 2% threshold

  // Separate entries into main types and others
  const { mainTypes, others } = Object.entries(prTypeStats).reduce(
    (acc, [type, count]) => {
      if (count >= threshold) {
        acc.mainTypes[type] = count;
      } else {
        acc.others += count;
      }
      return acc;
    },
    { mainTypes: {}, others: 0 },
  );

  // Prepare final data with "Other" category if needed
  const finalData = {
    ...mainTypes,
    ...(others > 0 ? { "(other)": others } : {}),
  };

  return (
    <div className="h-[300px] flex items-center justify-center">
      <Pie
        data={{
          labels: Object.entries(finalData).map(([type]) => type),
          datasets: [
            {
              data: Object.entries(finalData).map(([_, count]) => count),
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
