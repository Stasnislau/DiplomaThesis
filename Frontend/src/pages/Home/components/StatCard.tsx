interface StatCardProps {
  value: string;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label }) => {
  return (
    <div>
      <div className="text-4xl font-bold text-indigo-600 mb-2">{value}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
};
