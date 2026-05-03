import Button from "@/components/common/Button";
import { QuizQuestion } from "@/api/mutations/generateQuiz";
import { UserMaterial } from "@/api/mutations/saveMaterial";
import cn from "@/utils/cn";
import { useGenerateQuiz } from "@/api/hooks/useGenerateQuiz";
import { useGetUserMaterials } from "@/api/hooks/useGetUserMaterials";
import { useSaveMaterial } from "@/api/hooks/useSaveMaterial";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUploadMaterial } from "@/api/hooks/useUploadMaterial";

interface AnalyzedType {
  type: string;
  example: string;
}

const MaterialsTask = () => {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"upload" | "history" | "ready" | "quiz">("upload");
  const [analyzedTypes, setAnalyzedTypes] = useState<AnalyzedType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const { mutate: upload, isPending: isUploading, error: uploadError } = useUploadMaterial();
  const { mutate: generateQuizMutation, isPending: isGeneratingQuiz } = useGenerateQuiz();
  const { mutate: saveMaterial } = useSaveMaterial();
  const { data: userMaterials, isLoading: isMaterialsLoading } = useGetUserMaterials();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    upload(file, {
      onSuccess: (data) => {
        let types: AnalyzedType[] = [];
        if (Array.isArray(data.analyzed_types)) {
          types = data.analyzed_types.map(t => {
            if (typeof t === 'string') return { type: t, example: '' };
            return t;
          });
        }
        setAnalyzedTypes(types);
        setSelectedTypes(types.map(t => t.type));
        setView("ready");
        
        saveMaterial({
          filename: data.filename,
          analyzedTypes: types
        });
      }
    });
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerateQuiz = () => {
    setQuizError(null);
    generateQuizMutation(selectedTypes, {
      onSuccess: (data) => {
        const payload = data.quiz;
        if (
          payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { questions?: unknown }).questions)
        ) {
          setQuiz((payload as { questions: QuizQuestion[] }).questions);
          setSelectedAnswer({});
          setRevealedAnswers({});
          setView("quiz");
          return;
        }
        // Backend returned a string explanation (e.g. "No relevant material...")
        // or an unexpected shape. Surface a friendly i18n'd message.
        const backendMessage =
          typeof payload === "string" ? payload : "";
        setQuizError(
          backendMessage || t("materialsErrors.noRelevantMaterial"),
        );
      }
    });
  };




  const loadMaterial = (material: UserMaterial) => {
    setFile({ name: material.filename } as File);
    let types: AnalyzedType[] = [];
    if (Array.isArray(material.analyzedTypes)) {
      types = material.analyzedTypes.map((t) => {
        if (typeof t === 'string') return { type: t, example: '' };
        return t;
      });
    }
    setAnalyzedTypes(types);
    setSelectedTypes(types.map(t => t.type));
    setView("ready");
  };

  const handleSelectAnswer = (qIdx: number, answer: string) => {
    setSelectedAnswer(prev => ({ ...prev, [qIdx]: answer }));
  };

  const toggleRevealAnswer = (qIdx: number) => {
    setRevealedAnswers(prev => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const resetToUpload = () => {
    setFile(null);
    setAnalyzedTypes([]);
    setSelectedTypes([]);
    setQuiz([]);
    setQuizError(null);
    setSelectedAnswer({});
    setRevealedAnswers({});
    setView("upload");
  };

  return (
    <div className="space-y-6">
      {(view === "upload" || view === "history") && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/50 dark:to-orange-950/50 rounded-2xl p-6 border border-rose-100 dark:border-rose-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
              <span className="text-lg">📚</span>
            </div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t("tasks.chooseSource")}
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setView("upload")}
              className={cn(
                "py-4 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-2",
                view === "upload"
                  ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-rose-900/40 hover:border-rose-200 dark:hover:border-rose-700"
              )}
            >
              <span className="text-2xl">📤</span>
              <span>{t("tasks.uploadNewPdf")}</span>
            </button>
            <button
              onClick={() => setView("history")}
              className={cn(
                "py-4 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-2",
                view === "history"
                  ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-rose-900/40 hover:border-rose-200 dark:hover:border-rose-700"
              )}
            >
              <span className="text-2xl">📁</span>
              <span>{t("tasks.myMaterials")}</span>
            </button>
          </div>
        </div>
      )}

      {view === "upload" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <span className="text-lg">📄</span>
            </div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t("tasks.uploadPdfDocument")}
            </label>
          </div>
          
          <div 
            className={cn(
              "flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 transition-all duration-200 cursor-pointer",
              file 
                ? "border-rose-400 bg-rose-50" 
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
            )}
            onClick={() => document.getElementById('material-file-upload')?.click()}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="material-file-upload"
            />
            {file ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-3xl">📄</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{file.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("tasks.clickChangeFile")}</span>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">{t("tasks.clickSelectPdf")}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("tasks.maxSize")}</span>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900/50">
              <div className="flex items-center gap-3">
                <span className="text-lg">⚠️</span>
                <p className="text-sm text-red-600 font-medium">{uploadError.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      {view === "history" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <span className="text-lg">📁</span>
            </div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t("tasks.previouslyAnalyzed")}
            </label>
          </div>
          
          {isMaterialsLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              {t("materials.loadingMaterials")}
            </div>
          )}

          {!isMaterialsLoading && userMaterials?.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📭</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t("tasks.noSavedMaterials")}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t("tasks.uploadPdfGetStarted")}</p>
            </div>
          )}
          
          {!isMaterialsLoading && userMaterials && userMaterials.length > 0 && (
            <div className="grid gap-3">
              {userMaterials.map((material) => (
                <div
                  key={material.id}
                  onClick={() => loadMaterial(material)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center shadow-sm">
                      <span className="text-xl">📄</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-rose-700 transition-colors">{material.filename}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(material.createdAt).toLocaleDateString(i18n.language || "en", {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {material.analyzedTypes && ` • ${t("tasks.taskTypeCount", { count: (material.analyzedTypes as AnalyzedType[]).length })}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-rose-500 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("tasks.useAction")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analyze Button */}
      {view === "upload" && (
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          variant="primary"
          isLoading={isUploading}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-lg shadow-rose-500/25"
        >
          {isUploading ? t("tasks.analyzingDocument") : `📊 ${t("tasks.analyzeAndExtract")}`}
        </Button>
      )}

      {/* Ready Section - Task Types Selection */}
      {view === "ready" && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("tasks.analysisComplete")}</h2>
                <p className="text-emerald-100 text-sm">
                  {file?.name} • {analyzedTypes.length} task type{analyzedTypes.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
          </div>

          {/* Task Types */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {t("tasks.selectTaskTypes")}
                </label>
              </div>
              <button
                onClick={resetToUpload}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              >
                {t("tasks.newFile")}
              </button>
            </div>
            
            {analyzedTypes.length > 0 ? (
              <div className="grid gap-3">
                {analyzedTypes.map((entry, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleType(entry.type)}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all duration-200 border-2",
                      selectedTypes.includes(entry.type)
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md"
                        : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700/40 dark:bg-gray-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 mt-0.5 flex items-center justify-center flex-shrink-0 transition-all",
                        selectedTypes.includes(entry.type)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      )}>
                        {selectedTypes.includes(entry.type) && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{entry.type}</h4>
                        {entry.example && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic line-clamp-2">
                            {t("tasks.exampleLabel")} "{entry.example}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-center">
                <span className="text-2xl mb-2 block">🤔</span>
                <p className="font-medium">No specific task types identified</p>
                <p className="text-sm mt-1">I'll generate varied tasks based on the document content</p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz || (analyzedTypes.length > 0 && selectedTypes.length === 0)}
            variant="primary"
            isLoading={isGeneratingQuiz}
            className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
          >
            {isGeneratingQuiz ? t("tasks.generatingTasks") : t("tasks.generateSimilar")}
          </Button>

          {/* Quiz generation error (e.g. "No relevant material found...") */}
          {quizError && (
            <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">⚠️</span>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                {quizError}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quiz Section */}
      {view === "quiz" && (
        <div className="space-y-6">
          {/* Quiz Header */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-3xl">🎓</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t("tasks.generatedTasks")}</h2>
                  <p className="text-violet-100 text-sm">{t("tasks.questionsBasedOn", { count: quiz.length })}</p>
                </div>
              </div>
              <Button 
                onClick={() => setView("ready")} 
                variant="secondary"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                ← Back
              </Button>
            </div>
          </div>

          {/* Questions */}
          {quiz.map((q, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Question Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold">{idx + 1}</span>
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Question {idx + 1}</span>
                  </div>
                  {q.type && (
                    <span className="text-xs font-medium text-violet-700 bg-violet-100 px-3 py-1 rounded-full">
                      {q.type}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Question Content */}
              <div className="p-6">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">{q.question}</p>
                
                {q.options && q.options.length > 0 ? (
                  <div className="space-y-3">
                    {q.options.map((opt, i) => {
                      const isSelected = selectedAnswer[idx] === opt;
                      const isRevealed = revealedAnswers[idx];
                      const isCorrect = opt === q.correct_answer;
                      
                      return (
                        <div 
                          key={i} 
                          onClick={() => !isRevealed && handleSelectAnswer(idx, opt)}
                          className={cn(
                            "flex items-center p-4 rounded-xl border-2 transition-all duration-200",
                            isRevealed && isCorrect
                              ? "border-green-500 bg-green-50"
                              : isRevealed && isSelected && !isCorrect
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                              : isSelected
                              ? "border-violet-500 bg-violet-50"
                              : "border-gray-200 hover:border-violet-300 hover:bg-gray-50 dark:bg-gray-800 cursor-pointer"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0",
                            isRevealed && isCorrect
                              ? "border-green-500 bg-green-500"
                              : isRevealed && isSelected && !isCorrect
                              ? "border-red-500 bg-red-50 dark:bg-red-900/200"
                              : isSelected
                              ? "border-violet-500 bg-violet-500"
                              : "border-gray-300"
                          )}>
                            {(isSelected || (isRevealed && isCorrect)) && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                          <span className={cn(
                            "font-medium",
                            isRevealed && isCorrect ? "text-green-700" : 
                            isRevealed && isSelected && !isCorrect ? "text-red-700" : "text-gray-700 dark:text-gray-300"
                          )}>
                            {opt}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200">
                    <textarea 
                      className="w-full bg-transparent resize-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                      rows={3}
                      placeholder={t("tasks.typeAnswer")}
                      value={selectedAnswer[idx] || ''}
                      onChange={(e) => handleSelectAnswer(idx, e.target.value)}
                    />
                  </div>
                )}

                {/* Show Answer Button */}
                <button
                  onClick={() => toggleRevealAnswer(idx)}
                  className={cn(
                    "mt-4 flex items-center gap-2 text-sm font-medium transition-colors",
                    revealedAnswers[idx] ? "text-gray-500" : "text-violet-600 hover:text-violet-700"
                  )}
                >
                  {revealedAnswers[idx] ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      Hide Answer
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Show Answer
                    </>
                  )}
                </button>
                
                {revealedAnswers[idx] && (
                  <div className="mt-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Correct Answer:</span>
                      <span>{q.correct_answer}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Generate More Button */}
          <Button
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz}
            variant="secondary"
            isLoading={isGeneratingQuiz}
            className="w-full h-12 rounded-xl"
          >
            🔄 Generate More Tasks
          </Button>
        </div>
      )}
    </div>
  );
};

export default MaterialsTask;

