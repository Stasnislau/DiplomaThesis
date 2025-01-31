import React from "react";
import Button from "@/components/common/Button";

interface LanguageCardProps {
  name: string;
  code: string;
  isStarted: boolean;
  totalLessons?: number;
  completedLessons?: number;
  flagIcon: React.ReactNode;
  levels?: string[];
  currentLevel?: string;
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  name,
  isStarted,
  totalLessons,
  completedLessons,
  flagIcon,
  currentLevel,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {flagIcon}
          <h3 className="text-xl font-semibold">{name}</h3>
        </div>
      </div>

      {isStarted ? (
        <div>
          <div className="mb-4">
            <p className="text-gray-600">Current Level: {currentLevel}</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${(completedLessons! / totalLessons!) * 100}%`,
                }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
          <Button variant="primary" className="w-full">
            Continue Learning
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Take a placement test to start learning {name}
          </p>
          <Button variant="secondary" className="w-full">
            Take Placement Test
          </Button>
        </div>
      )}
    </div>
  );
};
