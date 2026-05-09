import { Link } from "react-router-dom";

interface UserStatsProps {
  title: string;
  value: number | string;
  icon: string;
  to?: string;
}

export const UserStats: React.FC<UserStatsProps> = ({ title, value, icon, to }) => {
  const cardClass =
    "bg-white dark:bg-gray-800 rounded-2xl shadow-md dark:shadow-gray-900/30 p-6 transform transition-all duration-200 hover:scale-105 border border-gray-100 dark:border-gray-700";
  const inner = (
    <>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-gray-600 dark:text-gray-400">{title}</div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`${cardClass} block hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer no-underline`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={cardClass}>{inner}</div>;
};