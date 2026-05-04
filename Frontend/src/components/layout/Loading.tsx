import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const LoadingPage = () => {
  const { t } = useTranslation();
  // Localised "Loading" base — `common.loading` already exists as
  // "Loading..." / "Ładowanie..." / "Cargando...". Strip the trailing
  // dots so we can re-add them in the animation cycle.
  const baseText = t('common.loading').replace(/\.+$/, '');
  const [loadingText, setLoadingText] = useState(baseText);

  useEffect(() => {
    setLoadingText(baseText);
    const textInterval = setInterval(() => {
      setLoadingText((prevText) => {
        if (prevText === `${baseText}...`) return baseText;
        return prevText + '.';
      });
    }, 500);

    return () => clearInterval(textInterval);
  }, [baseText]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="relative">
        <motion.div
          className="w-24 h-24 border-4 border-blue-500 dark:border-blue-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-0 left-0 w-24 h-24 border-t-4 border-green-500 dark:border-green-400 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-6 left-6 w-12 h-12 bg-blue-500 dark:bg-blue-400 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <motion.p
        className="mt-4 text-xl font-semibold text-blue-600 dark:text-blue-400"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {loadingText}
      </motion.p>
    </div>
  );
};

export default LoadingPage;

