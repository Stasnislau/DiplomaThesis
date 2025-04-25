import React from "react";
import Button from "@/components/common/Button";
import { LanguageLevel } from "@/types/models/LanguageLevel";

interface LanguageCardProps {
  name: string;
  code: string;
  isStarted: boolean;
  totalLessons?: number;
  completedLessons?: number;
  flagIcon: React.ReactNode;
  levels?: string[];
  currentLevel?: string | LanguageLevel;
  onStartTest: () => void;
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  name,
  isStarted,
  totalLessons,
  completedLessons,
  flagIcon,
  currentLevel,
  onStartTest,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {flagIcon}
          <h3 className="text-xl font-semibold">{name}</h3>
        </div>
      </div>

      {currentLevel === LanguageLevel.NATIVE ? (
        <div className="flex items-center justify-center text-green-600 font-medium p-4 bg-green-50 rounded-lg">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          Native Speaker
        </div>
      ) :
      /* Case 2: Learning Started */
      isStarted ? (
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
          <Button variant="primary" className="w-full ">
            Continue Learning
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Take a placement test to start learning {name}
          </p>
          <Button variant="secondary" className="w-full " onClick={onStartTest}>
            Take Placement Test
          </Button>
        </div>
      )}
    </div>
  );
};
