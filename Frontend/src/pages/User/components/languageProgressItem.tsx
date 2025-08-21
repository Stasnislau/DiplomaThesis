interface LanguageProgressProps {
  languageName: string;
  progress: number;
  level: string;
  color: string;
  isLoading: boolean;
}

export const LanguageProgressItem: React.FC<LanguageProgressProps> = ({
  languageName,
  progress,
  level,
  color,
  isLoading,
}) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="font-semibold text-gray-900">
        {isLoading ? (
          <div className="w-20 h-4 bg-gray-200 rounded-full" />
        ) : (
          languageName
        )}
      </span>
      <span className="text-gray-600">{level}</span>
    </div>
    <div className="h-4 bg-gray-200 rounded-full">
      <div
        className={`h-full bg-${color}-500 rounded-full`}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);
