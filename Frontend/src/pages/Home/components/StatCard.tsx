interface StatCardProps {
  value: string;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-2">
        {value}
      </div>
      <div className="text-gray-600 dark:text-gray-300 font-medium tracking-wide uppercase text-sm">
        {label}
      </div>
    </div>
  );
};
