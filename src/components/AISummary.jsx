import { useState, useEffect } from "react";

export default function AISummary({ data }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const generateSummary = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/ai-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            totalStars: data.totalStars,
            memberCount: data.memberCount,
            yearlyStats: data.yearlyStats,
            topReposByCommits: data.topReposByCommits.slice(0, 3),
          }),
        });

        if (response.status === 404) {
          setEnabled(false);
          return;
        }

        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }
        setSummary(result.summary);
      } catch (error) {
        console.error("Failed to generate summary:", error);
        setSummary("");
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [data]);

  if (!loading && !summary) return null;

  return (
    <div className="bg-gradient-to-br from-white to-secondary-50 p-8 rounded-xl shadow-sm mt-8">
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
          <span className="text-gray-600">Generating summary...</span>
        </div>
      ) : (
        <p className="text-xl leading-relaxed text-gray-800">{summary}</p>
      )}
    </div>
  );
}
