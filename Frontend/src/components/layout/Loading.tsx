import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const LoadingPage = () => {
  const [loadingText, setLoadingText] = useState('Loading');

  useEffect(() => {
    const textInterval = setInterval(() => {
      setLoadingText((prevText) => {
        if (prevText === 'Loading...') return 'Loading';
        return prevText + '.';
      });
    }, 500);

    return () => clearInterval(textInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="relative">
        <motion.div
          className="w-24 h-24 border-4 border-blue-500 rounded-full"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-0 left-0 w-24 h-24 border-t-4 border-green-500 rounded-full"
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-6 left-6 w-12 h-12 bg-blue-500 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      <motion.p
        className="mt-4 text-xl font-semibold text-blue-600"
        animate={{
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {loadingText}
      </motion.p>
    </div>
  );
};

export default LoadingPage;
