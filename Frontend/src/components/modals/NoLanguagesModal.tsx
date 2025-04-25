import React from "react";
import { motion } from "framer-motion";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { useSetNativeLanguage } from "@/api/hooks/useSetNativeLanguage";

export const NoLanguagesModal: React.FC = () => {
  const { languages, isLoading } = useAvailableLanguages();
  const { setNativeLanguage } = useSetNativeLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-8 max-w-lg w-full m-4 shadow-xl"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Select Your Language
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-h-80 overflow-y-auto my-4">
            {languages?.map((language) => (
              <motion.button
                key={language.id}
                onClick={() => {
                  setNativeLanguage(language.id);
                }}
                className="p-4 rounded-lg text-left transition-all w-full bg-gray-100 hover:bg-gray-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="font-medium">{language.name}</div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}; 