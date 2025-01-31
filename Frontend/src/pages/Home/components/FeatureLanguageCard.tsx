interface LanguageCardProps {
  language: string;
  flag: string;
  progress?: number;
  availableLessons: number;
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  language,
  flag,
  progress = 0,
  availableLessons,
}) => {
  return (
    <div className="relative group">
      <div className="relative p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <img src={flag} alt={language} className="w-12 h-12 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">{language}</h3>
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-indigo-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {availableLessons} lessons available
        </p>
      </div>
    </div>
  );
};
