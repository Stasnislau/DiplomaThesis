interface LanguageProgressProps {
  language: string;
  progress: number;
  level: string;
  color: string;
}

export const LanguageProgress: React.FC<LanguageProgressProps> = ({
  language,
  progress,
  level,
  color,
}) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="font-semibold text-gray-900">{language}</span>
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
