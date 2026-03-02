import { AnimatePresence, Variants, motion } from "framer-motion";
import {
  BritishFlagIcon,
  FrenchFlagIcon,
  GermanFlagIcon,
  ItalianFlagIcon,
  PolishFlagIcon,
  RussianFlagIcon,
  SpanishFlagIcon,
} from "@/assets/icons";
import React, { useState } from "react";

import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { useSetNativeLanguage } from "@/api/hooks/useSetNativeLanguage";

const flagIcons: Record<string, React.ReactElement> = {
  es: <SpanishFlagIcon className="w-10 h-10" />,
  fr: <FrenchFlagIcon className="w-10 h-10" />,
  de: <GermanFlagIcon className="w-10 h-10" />,
  it: <ItalianFlagIcon className="w-10 h-10" />,
  pl: <PolishFlagIcon className="w-10 h-10" />,
  en: <BritishFlagIcon className="w-10 h-10" />,
  ru: <RussianFlagIcon className="w-10 h-10" />,
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export const NoLanguagesModal: React.FC = () => {
  const { languages, isLoading } = useAvailableLanguages();
  const { setNativeLanguage } = useSetNativeLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (languageId: string) => {
    setSelectedId(languageId);
    // Small delay for the visual feedback before submitting
    setTimeout(() => {
      setNativeLanguage(languageId);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-pink-900/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100 dark:border-gray-700/50"
      >
        {/* Decorative gradient accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Icon */}
        <div className="flex justify-center mb-4 mt-2">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.15 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25"
          >
            <span className="text-3xl" role="img" aria-label="Globe">
              🌍
            </span>
          </motion.div>
        </div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-1"
        >
          What&apos;s your native language?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6"
        >
          This helps us personalize your learning experience
        </motion.p>

        {/* Language list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 dark:border-t-indigo-400 animate-spin" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Loading languages...
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-2 max-h-[340px] overflow-y-auto pr-1 -mr-1"
          >
            <AnimatePresence>
              {languages?.map((language) => {
                const isSelected = selectedId === language.id;
                const icon = flagIcons[language.code];

                return (
                  <motion.button
                    key={language.id}
                    variants={itemVariants}
                    onClick={() => handleSelect(language.id)}
                    disabled={selectedId !== null}
                    className={`
                      group relative flex items-center gap-4 w-full p-4 rounded-2xl
                      text-left transition-all duration-200 outline-none
                      focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                      dark:focus-visible:ring-offset-gray-800
                      ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 scale-[1.02]"
                          : "bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-md border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700/50"
                      }
                      ${selectedId !== null && !isSelected ? "opacity-50 pointer-events-none" : ""}
                    `}
                    whileHover={!selectedId ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!selectedId ? { scale: 0.98 } : {}}
                  >
                    {/* Flag icon */}
                    <div
                      className={`
                        flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                        transition-all duration-200
                        ${
                          isSelected
                            ? "bg-white/20"
                            : "bg-white dark:bg-gray-600/50 shadow-sm group-hover:shadow-md group-hover:scale-110"
                        }
                      `}
                    >
                      {icon || (
                        <span className="text-2xl" role="img" aria-label={language.name}>
                          🏳️
                        </span>
                      )}
                    </div>

                    {/* Language name */}
                    <div className="flex-grow">
                      <span
                        className={`
                          font-semibold text-base transition-colors duration-200
                          ${
                            isSelected
                              ? "text-white"
                              : "text-gray-800 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300"
                          }
                        `}
                      >
                        {language.name}
                      </span>
                      <span
                        className={`
                          block text-xs font-medium uppercase tracking-wider mt-0.5
                          ${
                            isSelected
                              ? "text-white/70"
                              : "text-gray-400 dark:text-gray-500"
                          }
                        `}
                      >
                        {language.code}
                      </span>
                    </div>

                    {/* Selection indicator */}
                    <div
                      className={`
                        flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                        transition-all duration-300
                        ${
                          isSelected
                            ? "border-white bg-white"
                            : "border-gray-300 dark:border-gray-500 group-hover:border-indigo-400 dark:group-hover:border-indigo-500"
                        }
                      `}
                    >
                      {isSelected && (
                        <motion.svg
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="w-3.5 h-3.5 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </motion.svg>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-center text-gray-400 dark:text-gray-500 mt-5"
        >
          You can change this later in your profile settings
        </motion.p>
      </motion.div>
    </div>
  );
};