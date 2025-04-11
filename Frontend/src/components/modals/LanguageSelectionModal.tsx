import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store/useUserStore";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";

interface LanguageOption {
  id: string;
  name: string;
  code: string;
}

export function LanguageSelectionModal() {
  const { 
    showLanguageModal, 
    setShowLanguageModal, 
    setNativeLanguage, 
    setTargetLanguage, 
    nativeLanguage, 
    targetLanguage 
  } = useUserStore();
  
  const [step, setStep] = useState<"native" | "target">("native");
  const { languages, isLoading } = useAvailableLanguages();
  
  const handleSelectLanguage = (language: LanguageOption) => {
    if (step === "native") {
      setNativeLanguage(language.code);
      setStep("target");
    } else {
      setTargetLanguage(language.code);
      setShowLanguageModal(false);
    }
  };
  
  // Prevent closing the modal if languages are not selected
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showLanguageModal) {
        e.preventDefault();
      }
    };
    
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showLanguageModal]);
  
  if (!showLanguageModal) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg p-8 max-w-lg w-full m-4 shadow-xl"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          {step === "native" 
            ? "What is your native language?" 
            : "What language do you want to learn?"}
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-h-80 overflow-y-auto my-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {languages?.map((language) => (
                  <motion.button
                    key={language.id}
                    onClick={() => handleSelectLanguage(language)}
                    className={`p-4 rounded-lg text-left transition-all w-full ${
                      (step === "native" && nativeLanguage === language.code) ||
                      (step === "target" && targetLanguage === language.code)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-medium">{language.name}</div>
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        
        {step === "target" && (
          <div className="mt-4 flex justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep("native")}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              Back
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLanguageModal(false)}
              className={`px-4 py-2 rounded-lg ${
                targetLanguage 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-300 cursor-not-allowed"
              }`}
              disabled={!targetLanguage}
            >
              Finish
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
} 