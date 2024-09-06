import React, { useState } from 'react';
import { useCreateTask } from '../api/hooks/useCreateTask';

export const HomePage: React.FC = () => {
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const { createTask, isLoading, error, isSuccess, data } = useCreateTask();

  const handleCreateTask = () => {
    if (language && level) {
      createTask({ language, level });
      setUserAnswer(''); // Reset the user answer field
      setShowAnswer(false); // Hide the correct answer
    } else {
      alert('Please select both language and level.');
    }
  };

  const handleCheckAnswer = () => {
    if (
      userAnswer.toString().trim().toLocaleUpperCase() ===
      data.correct_answer.toString().toLocaleUpperCase()
    ) {
      alert('Correct!');
    } else {
      alert('Incorrect, try again.');
    }
  };

  const handleRevealAnswer = () => {
    setShowAnswer(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Create a Language Task
      </h1>
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="mb-6">
          <label
            htmlFor="language"
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Language</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Russian">Russian</option>
            <option value="Polish">Polish</option>
          </select>
        </div>
        <div className="mb-6">
          <label
            htmlFor="level"
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Level
          </label>
          <select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Level</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>
        </div>
        <button
          onClick={handleCreateTask}
          className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Create Task
        </button>
        {isLoading && <p className="text-blue-500 mt-4">Loading...</p>}
        {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
        {isSuccess && (
          <>
            <p className="text-green-500 mt-4">Task created: {data.task}</p>
            <div className="mt-6">
              <label
                htmlFor="userAnswer"
                className="block text-lg font-medium text-gray-700 mb-2"
              >
                Your Answer
              </label>
              <input
                id="userAnswer"
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleCheckAnswer}
                className="w-full mt-4 p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              >
                Check Answer
              </button>
              <button
                onClick={handleRevealAnswer}
                className="w-full mt-4 p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                Reveal Answer
              </button>
              {showAnswer && (
                <p className="text-gray-700 mt-4">
                  Correct Answer: {data.correct_answer}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
