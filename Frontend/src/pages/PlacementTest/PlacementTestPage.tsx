import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { usePlacementTask } from "@/api/hooks/usePlacementTask";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "@/components/layout/Loading";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { PlacementTaskComponent } from "./components/PlacementTaskComponent";
const TOTAL_QUESTIONS = 10;

export function PlacementTestPage() {
  const { languageCode } = useParams<{ languageCode: string }>();
  const navigate = useNavigate();
  const { createTask, isLoading, data: task } = usePlacementTask();
  const { currentQuestionNumber, answers, isTestComplete, addAnswer } =
    usePlacementTestStore();
  const { languages } = useAvailableLanguages();

  useEffect(() => {
    if (!languageCode || !languages) {
      navigate("/");
      return;
    }

    const language = languages.find((lang) => lang.code === languageCode);
    if (!language) {
      navigate("/");
      return;
    }

    if (isTestComplete) {
      navigate(`/placement/result/${languageCode}`);
      return;
    }

    const lastAnswer = answers[answers.length - 1];
    createTask({
      language: language.name,
      previousAnswer: lastAnswer
        ? {
            isCorrect: lastAnswer.isCorrect,
            questionNumber: lastAnswer.questionNumber,
          }
        : undefined,
    });
  }, [currentQuestionNumber, languageCode, languages]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionNumber}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {task && !isLoading ? (
              <PlacementTaskComponent
                taskData={{
                  ...task,
                  question: task.task,
                  correctAnswer: task.correct_answer,
                }}
                currentQuestion={currentQuestionNumber}
                totalQuestions={TOTAL_QUESTIONS}
                onAnswer={(placementAnswer) => {
                  addAnswer({
                    ...placementAnswer,
                    taskType: task.type,
                    question: task.task,
                  });
                }}
              />
            ) : (
              <LoadingSpinner />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
