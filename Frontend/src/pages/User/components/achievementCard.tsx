interface AchievementCardProps {
  title: string;
  description: string;
  progress: number;
  icon: string;
  isUnlocked?: boolean;
  maxProgress?: number;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  title,
  description,
  progress,
  icon,
  isUnlocked = false,
  maxProgress = 100,
}) => {
  const percentage = Math.min(100, (progress / maxProgress) * 100);

  return (
    <div
      className={`relative rounded-2xl p-5 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg border overflow-hidden ${
        isUnlocked
          ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/15 dark:to-orange-900/10 border-amber-200 dark:border-amber-700/50"
          : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* Unlocked glow */}
      {isUnlocked && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-300/30 to-transparent rounded-bl-full" />
      )}

      <div className="flex items-start gap-3.5 mb-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            isUnlocked
              ? "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-800/40 dark:to-yellow-800/30 shadow-sm"
              : "bg-gray-100 dark:bg-gray-700 grayscale opacity-60"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3
            className={`text-sm font-bold mb-0.5 ${
              isUnlocked
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isUnlocked
                ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                : "bg-indigo-400 dark:bg-indigo-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
          {progress}/{maxProgress}
        </span>
      </div>
    </div>
  );
};
