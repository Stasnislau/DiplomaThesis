interface UserStatsProps {
  title: string;
  value: number;
  icon: string;
}

export const UserStats: React.FC<UserStatsProps> = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md dark:shadow-gray-900/30 p-6 transform transition-all duration-200 hover:scale-105 border border-gray-100 dark:border-gray-700">
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    <div className="text-gray-600 dark:text-gray-400">{title}</div>
  </div>
);