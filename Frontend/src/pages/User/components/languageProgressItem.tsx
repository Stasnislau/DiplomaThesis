interface LanguageProgressProps {
  languageName: string;
  progress: number;
  level: string;
  color: string;
  isLoading: boolean;
}

const COLOR_MAP: Record<string, { bar: string; bg: string; text: string; label: string }> = {
  indigo: {
    bar: "bg-indigo-500",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-300",
    label: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  purple: {
    bar: "bg-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    label: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  blue: {
    bar: "bg-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    label: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  green: {
    bar: "bg-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  gold: {
    bar: "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    label: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 dark:from-amber-900/40 dark:to-yellow-900/40 dark:text-amber-300",
  },
  gray: {
    bar: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-400",
    label: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  },
};

export const LanguageProgressItem: React.FC<LanguageProgressProps> = ({
  languageName,
  progress,
  level,
  color,
  isLoading,
}) => {
  const colors = COLOR_MAP[color] || COLOR_MAP.gray;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          ) : (
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              {languageName}
            </span>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.label}`}>
          {level}
        </span>
      </div>
      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
