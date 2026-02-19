import Button from "@/components/common/Button";
import { Link } from "react-router-dom";

interface FeatureCardProps {
  title: string;
  description: string;
  linkTo: string;
  buttonText: string;
  buttonVariant: "primary" | "secondary" | "tertiary";
  gradientFrom: string;
  gradientTo: string;
}

// Safely map specific colors if needed, but assuming user setup is standard.
// Using inline styles for dynamic gradients if classes fail? No, stick to classes for now.
// Note: Tailwind doesn't support string interpolation for classes in build time unless safelisted.

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
    <div className="relative group p-1">
      <div
        className={`absolute inset-0 bg-gradient-to-r from-${gradientFrom} to-${gradientTo} rounded-3xl opacity-75 group-hover:opacity-100 blur-sm group-hover:blur transition-all duration-300`}
      />
      <div className="relative p-8 bg-white dark:bg-gray-800 rounded-3xl h-full flex flex-col items-start transition-colors duration-300">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-8 flex-grow leading-relaxed">{description}</p>
        <Link to={linkTo} className="mt-auto">
          <Button variant={buttonVariant} className="px-6">{buttonText}</Button>
        </Link>
      </div>
    </div>
  );
};
