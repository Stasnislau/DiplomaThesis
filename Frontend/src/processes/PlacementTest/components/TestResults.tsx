import { useNavigate, useParams } from "react-router-dom";

import { BRIDGE_MICROSERVICE_URL } from "@/api/consts";
import LoadingSpinner from "@/components/layout/Loading";
import { fetchWithAuth } from "@/api/fetchWithAuth";
import { motion } from "framer-motion";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { useCompletePlacementTest } from "@/api/hooks/useCompletePlacementTest";
import { useEffect } from "react";
import { useEvaluatePlacementTest } from "../api/hooks/useEvaluatePlacementTest";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const TestResults = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userAnswers, cachedTasks, resetTest, language: storeLanguage } = usePlacementTestStore();
  const { languageCode } = useParams<{ languageCode: string }>();
  const {
    evaluateTest,
    isLoading,
    data: evaluation,
    error: evaluateError,
  } = useEvaluatePlacementTest();
  const { languages, isLoading: isLoadingLanguages } = useAvailableLanguages();
  const { completeTest, isLoading: isLoadingCompleteTest } =
    useCompletePlacementTest();

  useEffect(() => {
    if (!languageCode || cachedTasks.length === 0) {
      navigate("/");
      return;
    }

    if (!evaluation && !isLoading && !evaluateError) {
      evaluateTest({
        answers: userAnswers,
        language: storeLanguage?.name || languageCode,
      });
    }
  }, [
    userAnswers,
    cachedTasks,
    navigate,
    languageCode,
    storeLanguage,
    evaluateTest,
    evaluation,
    isLoading,
    evaluateError,
  ]);

  const correctAnswers = userAnswers.filter((a) => a.isCorrect).length;
  const totalQuestions = userAnswers.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const handleSaveLevel = async () => {
    if (!languages || !languageCode || !evaluation) {
      return;
    }

    const language = languages.find(
      (lang) => lang.code.toLowerCase() === languageCode.toLowerCase()
    );

    if (!language) {
      return;
    }

    await completeTest({
      languageId: language.id,
      level: evaluation.level,
      score: percentage,
      feedback: {
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        recommendation: evaluation.recommendation,
        confidence: evaluation.confidence,
      },
    });

    if (evaluation.level !== "A1") {
      try {
        await fetchWithAuth(`${BRIDGE_MICROSERVICE_URL}/learning-path/bulk-complete`, {
          method: "POST",
          body: JSON.stringify({ userLevel: evaluation.level }),
        });
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "learning-path",
        });
      } catch {
        console.error("Failed to complete learning path");
      }
    }

    navigate("/learning-path", {
      state: {
        language: language.name.toLowerCase(),
        level: evaluation.level,
      },
    });

  };

  if (isLoading || isLoadingLanguages) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 transition-colors duration-200"
      >
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          {t("placementTest.resultsTitle")}
        </h1>

        <div className="space-y-8">
          <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block p-6 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4"
              >
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {percentage}%
                </span>
            </motion.div>

            {evaluation && (
              <>
                <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
                  {t("placementTest.recommendedLevel")} {evaluation.level}
                </h2>
                <div className="text-gray-600 dark:text-gray-400 mb-4">
                  {t("placementTest.confidence", { value: evaluation.confidence })}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">
                      {t("placementTest.strengths")}
                    </h3>
                    <ul className="space-y-2">
                      {evaluation.strengths.map(
                        (strength: string, idx: number) => (
                          <li key={idx} className="text-green-700 dark:text-green-400">
                            • {strength}
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
                    <h3 className="font-semibold text-red-800 dark:text-red-300 mb-3">
                      {t("placementTest.areasToImprove")}
                    </h3>
                    <ul className="space-y-2">
                      {evaluation.weaknesses.map(
                        (weakness: string, idx: number) => (
                          <li key={idx} className="text-red-700 dark:text-red-400">
                            • {weakness}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                    {t("placementTest.recommendation")}
                  </h3>
                  <p className="text-blue-700 dark:text-blue-400">{evaluation.recommendation}</p>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t("placementTest.questionAnalysis")}</h3>
            <div className="space-y-4">
              {userAnswers.map((answer, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg ${
                    answer.isCorrect 
                      ? "bg-green-50 dark:bg-green-900/20" 
                      : "bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <p className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                    {t("placementTest.questionLabel", { num: index + 1 })} {cachedTasks[index].question}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("placementTest.yourAnswer")} {answer.userAnswer}
                  </p>
                  {!answer.isCorrect && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("placementTest.correctAnswer")} {cachedTasks[index].correctAnswer}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetTest();
                navigate(`/placement/test/${languageCode}`);
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              {t("placementTest.takeTestAgain")}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveLevel}
              disabled={isLoadingCompleteTest}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-400"
            >
              {isLoadingCompleteTest ? t("placementTest.saving") : t("placementTest.saveLevelButton")}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              {t("placementTest.goDashboard")}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TestResults;
