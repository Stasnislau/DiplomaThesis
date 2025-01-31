interface UserStatsProps {
    title: string;
    value: number;
    icon: string;
  }
  
  export const UserStats: React.FC<UserStatsProps> = ({ title, value, icon }) => (
    <div className="bg-white rounded-2xl shadow-md p-6 transform transition-transform hover:scale-105">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-gray-600">{title}</div>
    </div>
  );