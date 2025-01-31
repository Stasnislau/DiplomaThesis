import { Link } from "react-router-dom";
import Button from "@/components/common/Button";

interface FeatureCardProps {
  title: string;
  description: string;
  linkTo: string;
  buttonText: string;
  buttonVariant: "primary" | "secondary" | "tertiary";
  gradientFrom: string;
  gradientTo: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  linkTo,
  buttonText,
  buttonVariant,
  gradientFrom,
  gradientTo,
}) => {
  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-r from-${gradientFrom} to-${gradientTo} rounded-3xl transform transition-transform group-hover:scale-105`}
      />
      <div className="relative p-8 bg-white rounded-3xl transform transition-transform">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-600 mb-6">{description}</p>
        <Link to={linkTo}>
          <Button variant={buttonVariant}>{buttonText}</Button>
        </Link>
      </div>
    </div>
  );
};
