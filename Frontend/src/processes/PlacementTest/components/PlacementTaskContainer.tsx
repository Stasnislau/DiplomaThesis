import { AnimatePresence, motion } from "framer-motion";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { PlacementTask } from "./PlacementTask";
import LoadingSpinner from "@/components/layout/Loading";
import { PlacementAnswer } from "../types/EvaluationResult";
import { usePlacementTask } from "../api/hooks/usePlacementTask";
import { useEffect } from "react";

export const PlacementTaskContainer = () => {
  const { currentQuestionNumber, getCurrentTask, addAnswer } =
    usePlacementTestStore();
  const currentTask = getCurrentTask();
  const { createTask, isLoading } = usePlacementTask();
  const { language, addTask, isTestComplete } = usePlacementTestStore();

  useEffect(() => {
    const fetchTask = async () => {
      if (currentTask || isLoading || !language || language.name === "") {
        return;
      }

      const task = await createTask({
        language: language.name,
      });
      if (task) {
        addTask(task);
      }
    };
    fetchTask();
  }, [createTask, language, currentTask, isLoading, addTask]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentQuestionNumber}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
      >
        {currentTask && !isLoading && (
          <PlacementTask
            task={currentTask}
            isLoading={isLoading}
            onAnswer={(placementAnswer: PlacementAnswer) => {
              addAnswer({
                ...placementAnswer,
                questionNumber: currentQuestionNumber,
              });
              if (!isTestComplete) {
                createTask({
                  language: language.name,
                  previousAnswer: {
                    isCorrect: placementAnswer.isCorrect,
                    questionNumber: currentQuestionNumber,
                  },
                });
              }
            }}
            currentQuestion={currentQuestionNumber}
          />
        )}
        {isLoading && <LoadingSpinner />}
      </motion.div>
    </AnimatePresence>
  );
};

export default PlacementTaskContainer;
