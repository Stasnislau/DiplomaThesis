import { TOTAL_QUESTIONS } from "@/constants";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";

export const PlacementTaskTopBar = () => {
  const { currentQuestionNumber, language } = usePlacementTestStore();

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Placement Test: {language.name}
        </h1>
        <div className="text-sm font-medium text-gray-600">
          Question {currentQuestionNumber + 1} of {TOTAL_QUESTIONS}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full"
          style={{
            width: `${((currentQuestionNumber + 1) / TOTAL_QUESTIONS) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
};
