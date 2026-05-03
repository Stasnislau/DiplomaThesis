import React, { useState } from "react";

import { Link } from "react-router-dom";
import Spinner from "@/components/common/Spinner";
import { TaskHistoryType } from "@/api/queries/getHistory";
import { useGetHistory } from "@/api/hooks/useGetHistory";
import { useTranslation } from "react-i18next";

const TYPE_FILTERS: { value: "" | TaskHistoryType; emoji: string }[] = [
  { value: "", emoji: "📚" },
  { value: "placement", emoji: "📊" },
  { value: "speaking", emoji: "🎙️" },
  { value: "listening", emoji: "🎧" },
  { value: "writing", emoji: "📝" },
  { value: "materials", emoji: "📖" },
  { value: "lesson", emoji: "🎯" },
];

const TYPE_BADGE: Record<string, string> = {
  placement: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  speaking: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  listening: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  writing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  materials: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  lesson: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const HistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<"" | TaskHistoryType>("");
  const { data: entries, isLoading, error } = useGetHistory({
    type: filter || undefined,
    limit: 100,
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language || "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-6"
        >
          <span className="text-lg">←</span>
          <span className="font-medium">{t("nav.home")}</span>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl shadow-md">
              🕒
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("history.title")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("history.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value || "all"}
                onClick={() => setFilter(f.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  filter === f.value
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-600"
                }`}
              >
                {f.emoji}{" "}
                {t(`history.filter.${f.value || "all"}`)}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner size={32} color="#4F46E5" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-400">
            {t("history.loadFailed")}
          </div>
        )}

        {!isLoading && entries && entries.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t("history.empty.title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {t("history.empty.body")}
            </p>
          </div>
        )}

        {!isLoading && entries && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => {
              const badge =
                TYPE_BADGE[entry.taskType] ||
                "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
              return (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${badge}`}
                        >
                          {t(`history.type.${entry.taskType}`, {
                            defaultValue: entry.taskType,
                          })}
                        </span>
                        {entry.language && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono uppercase">
                            {entry.language}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {entry.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    {typeof entry.score === "number" && (
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {entry.score}
                          <span className="text-sm text-gray-400">
                            /100
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
