interface AchievementCardProps {
  title: string;
  description: string;
  progress: number;
  icon: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  title,
  description,
  progress,
  icon,
}) => (
  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 transform transition-transform hover:scale-105">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{description}</p>
    <div className="h-2 bg-gray-200 rounded-full">
      <div
        className="h-full bg-indigo-500 rounded-full"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);
