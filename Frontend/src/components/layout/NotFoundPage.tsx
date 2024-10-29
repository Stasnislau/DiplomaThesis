import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const NotFound: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.h1
          className="text-6xl font-bold text-gray-800 mb-4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, times: [0, 0.5, 1] }}
        >
          404
        </motion.h1>
        <motion.p
          className="text-xl text-gray-600 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Oops! The page you're looking for doesn't exist.
        </motion.p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Go Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
