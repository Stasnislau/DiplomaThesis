import React from "react";
import { Link } from "react-router-dom";
import Button from "@/components/common/Button";

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl leading-normal font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
            Welcome to EasyLanguage
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your journey to mastering new languages starts here
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 rounded-3xl transform transition-transform group-hover:scale-105" />
            <div className="relative p-8 bg-white rounded-3xl transform transition-transform">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Language Quiz
              </h3>
              <p className="text-gray-600 mb-6">
                Test your knowledge with interactive quizzes in multiple
                languages
              </p>
              <Link to="/quiz">
                <Button variant="primary">Start Quiz</Button>
              </Link>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-3xl transform transition-transform group-hover:scale-105" />
            <div className="relative p-8 bg-white rounded-3xl transform transition-transform">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Practice Area
              </h3>
              <p className="text-gray-600 mb-6">
                Improve your skills with targeted practice exercises
              </p>
              <Link to="/practice">
                <Button variant="secondary">Start Practice</Button>
              </Link>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-500 rounded-3xl transform transition-transform group-hover:scale-105" />
            <div className="relative p-8 bg-white rounded-3xl transform transition-transform">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Your Progress
              </h3>
              <p className="text-gray-600 mb-6">
                Track your learning journey and achievements
              </p>
              <Link to="/profile">
                <Button variant="tertiary">View Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">6</div>
              <div className="text-gray-600">Languages Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                1000+
              </div>
              <div className="text-gray-600">Practice Questions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                24/7
              </div>
              <div className="text-gray-600">Learning Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to start learning?
          </h2>
          <Link to="/quiz">
            <Button variant="primary" className="max-w-xs mx-auto">
              Take Your First Quiz
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
