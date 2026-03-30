import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

import LoadingSpinner from "@/components/layout/Loading";
import { PlacementTask } from "./PlacementTask";
import { UserAnswer } from "@/store/usePlacementTestStore";
import { usePlacementTask } from "../api/hooks/usePlacementTask";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";

export const PlacementTaskContainer = () => {
    const { createTask } = usePlacementTask();

  const {
    language,
    currentQuestionNumber,
    userAnswers,
    isTestComplete,
    testTotalQuestions,
    currentTask,
    nextTask,
    addAnswer,
    setTasks,
    setNextTask,
    advanceTasks,
  } = usePlacementTestStore();

  const isFetching = useRef(false);

  useEffect(() => {
    const fetcher = async () => {
      if (
        !language.name ||
        isTestComplete ||
        isFetching.current ||
        (currentTask && nextTask) ||
        currentQuestionNumber >= testTotalQuestions
      ) {
        return;
      }
  
      isFetching.current = true;
  
      try {
        if (!currentTask && !nextTask) {
          const [task1, task2] = await Promise.all([
            createTask({ language: language.name }),
            testTotalQuestions > 1
              ? createTask({
                  language: language.name,
                  previousAnswer: {
                    isCorrect: true,
                    questionNumber: 0,
                  },
                })
              : Promise.resolve(null),
          ]);
          setTasks({ current: task1, next: task2 });
        } else if (currentTask && !nextTask) {
          const lastAnswer = userAnswers[userAnswers.length - 1];
          if (currentQuestionNumber < testTotalQuestions) {
            const task = await createTask({
              language: language.name,
              previousAnswer: lastAnswer
                ? {
                    isCorrect: lastAnswer.isCorrect,
                    questionNumber: lastAnswer.questionNumber,
                  }
                : undefined,
            });
            setNextTask(task);
          }
        } else if (!currentTask && nextTask) {
          // If the user answered faster than nextTask could load, 
          // we now have nextTask but no currentTask.
          setTasks({ current: nextTask, next: null });
        }
      } finally {
        isFetching.current = false;
      }
    };
  
    fetcher();
  }, [
    language,
    currentQuestionNumber,
    currentTask,
    nextTask,
    isTestComplete,
    createTask,
    setTasks,
    setNextTask,
    testTotalQuestions,
    userAnswers,
  ]);

  const handleAnswer = (placementAnswer: UserAnswer) => {
    if (!currentTask) return;
    addAnswer(
      {
        ...placementAnswer,
        questionNumber: currentQuestionNumber,
        question: currentTask.question
      },
      currentTask
    );
    advanceTasks();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentQuestionNumber}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
      >
        {!currentTask ? (
          <LoadingSpinner />
        ) : (
          <PlacementTask
            task={currentTask}
            onAnswer={handleAnswer}
            currentQuestion={currentQuestionNumber} 
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PlacementTaskContainer;
