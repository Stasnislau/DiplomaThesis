import { motion } from "framer-motion";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect,  } from "react";
import { useEvaluatePlacementTest } from "@/api/hooks/useEvaluatePlacementTest";
import LoadingSpinner from "@/components/layout/Loading";

interface EvaluationResult {
  level: string;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export function PlacementResultPage() {
  const { languageCode } = useParams<{ languageCode: string }>();
  const { userAnswers, cachedTasks, resetTest } = usePlacementTestStore();
  const navigate = useNavigate();
  const { evaluateTest, isLoading, data: evaluation } = useEvaluatePlacementTest();

  useEffect(() => {
    if (!languageCode || cachedTasks.length === 0) {
      navigate("/");
      return;
    }

    if (!evaluation && !isLoading) {
      evaluateTest({
        answers: userAnswers,
        language: languageCode,
      });
    }
  }, [userAnswers, cachedTasks, navigate, languageCode, evaluateTest, evaluation, isLoading]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const correctAnswers = userAnswers.filter((a) => a.isCorrect).length;
  const totalQuestions = userAnswers.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-8"
        >
          <h1 className="text-3xl font-bold text-center mb-8">
            Your Placement Test Results
          </h1>

          <div className="space-y-8">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block p-6 bg-blue-100 rounded-full mb-4"
              >
                <span className="text-4xl font-bold text-blue-600">
                  {percentage}%
                </span>
              </motion.div>
              
              {evaluation && (
                <>
                  <h2 className="text-2xl font-semibold mb-2">
                    Recommended Level: {evaluation.level}
                  </h2>
                  <div className="text-gray-600 mb-4">
                    Confidence: {evaluation.confidence}%
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-green-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-3">Strengths</h3>
                      <ul className="space-y-2">
                        {evaluation.strengths.map((strength, idx) => (
                          <li key={idx} className="text-green-700">• {strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-red-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-3">Areas to Improve</h3>
                      <ul className="space-y-2">
                        {evaluation.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-red-700">• {weakness}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3">Recommendation</h3>
                    <p className="text-blue-700">{evaluation.recommendation}</p>
                  </div>
                </>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Question Analysis</h3>
              <div className="space-y-4">
                {userAnswers.map((answer, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg ${
                      answer.isCorrect ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <p className="font-medium mb-2">
                      Question {index + 1}: {cachedTasks[index].question}
                    </p>
                    <p className="text-sm text-gray-600">
                      Your answer: {answer.userAnswer}
                    </p>
                    {!answer.isCorrect && (
                      <p className="text-sm text-gray-600">
                        Correct answer: {cachedTasks[index].correctAnswer}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex justify-center space-x-4 mt-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetTest();
                  navigate(`/placement/test/${languageCode}`);
                }}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Take Test Again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Go to Dashboard
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 