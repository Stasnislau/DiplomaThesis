interface ModeOption {
  key: string;
  label: string;
  icon: string;
  description?: string;
}

interface LessonModePickerProps {
  modes: ModeOption[];
  active: string;
  onChange: (key: string) => void;
}

/**
 * Pill-style segmented control for letting the learner choose how to
 * practice a lesson. We use it for lesson types that have more than
 * one meaningful exercise format — e.g. writing_essay can be a full
 * essay OR a quick fill-in-blank quiz over the lesson keywords;
 * speaking can be reading a phrase OR free-speaking on a topic.
 */
const LessonModePicker = ({
  modes,
  active,
  onChange,
}: LessonModePickerProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
    <div role="tablist" className="flex flex-wrap gap-2">
      {modes.map((mode) => {
        const isActive = mode.key === active;
        return (
          <button
            key={mode.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(mode.key)}
            className={`flex-1 min-w-[140px] text-left px-4 py-3 rounded-xl border transition-colors ${
              isActive
                ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <span aria-hidden="true">{mode.icon}</span>
              {mode.label}
            </div>
            {mode.description && (
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                {mode.description}
              </p>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export default LessonModePicker;
