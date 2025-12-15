import { useState } from "react";
import { useUploadMaterial } from "@/api/hooks/useUploadMaterial";
import { useGenerateQuiz } from "@/api/hooks/useGenerateQuiz";
import { useSaveMaterial } from "@/api/hooks/useSaveMaterial";
import { useGetUserMaterials } from "@/api/hooks/useGetUserMaterials";
import Button from "@/components/common/Button";
import { QuizQuestion } from "@/api/mutations/generateQuiz";
import cn from "@/utils/cn";

interface AnalyzedType {
  type: string;
  example: string;
}

const MaterialsTask = () => {
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"upload" | "history" | "ready" | "quiz">("upload");
  const [analyzedTypes, setAnalyzedTypes] = useState<AnalyzedType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
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
    generateQuizMutation(selectedTypes, {
      onSuccess: (data) => {
        if (data.quiz && Array.isArray(data.quiz.questions)) {
          setQuiz(data.quiz.questions);
          setSelectedAnswer({});
          setRevealedAnswers({});
          setView("quiz");
        } else {
          console.error("Unexpected quiz format", data);
        }
      }
    });
  };

  const loadMaterial = (material: any) => {
    setFile({ name: material.filename } as File);
    let types: AnalyzedType[] = [];
    if (Array.isArray(material.analyzedTypes)) {
      types = material.analyzedTypes.map((t: any) => {
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
    setSelectedAnswer({});
    setRevealedAnswers({});
    setView("upload");
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      {(view === "upload" || view === "history") && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl p-6 border border-rose-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <span className="text-lg">📚</span>
            </div>
            <label className="text-sm font-semibold text-gray-800">
              Choose Source
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setView("upload")}
              className={cn(
                "py-4 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-2",
                view === "upload"
                  ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-rose-50 hover:border-rose-200"
              )}
            >
              <span className="text-2xl">📤</span>
              <span>Upload New PDF</span>
            </button>
            <button
              onClick={() => setView("history")}
              className={cn(
                "py-4 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-2",
                view === "history"
                  ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-rose-50 hover:border-rose-200"
              )}
            >
              <span className="text-2xl">📁</span>
              <span>My Materials</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {view === "upload" && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <span className="text-lg">📄</span>
            </div>
            <label className="text-sm font-semibold text-gray-800">
              Upload PDF Document
            </label>
          </div>
          
          <div 
            className={cn(
              "flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 transition-all duration-200 cursor-pointer",
              file 
                ? "border-rose-400 bg-rose-50" 
                : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
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
                <span className="text-lg font-semibold text-gray-900">{file.name}</span>
                <span className="text-sm text-gray-500 mt-1">Click to change file</span>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="text-lg font-medium text-gray-700">Click to select PDF file</span>
                <span className="text-sm text-gray-500 mt-1">Max size 10MB</span>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
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
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-lg">📁</span>
            </div>
            <label className="text-sm font-semibold text-gray-800">
              Previously Analyzed Materials
            </label>
          </div>
          
          {isMaterialsLoading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              Loading your materials...
            </div>
          )}
          
          {!isMaterialsLoading && userMaterials?.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📭</span>
              </div>
              <p className="text-gray-500 font-medium">No saved materials yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload a PDF to get started</p>
            </div>
          )}
          
          {!isMaterialsLoading && userMaterials && userMaterials.length > 0 && (
            <div className="grid gap-3">
              {userMaterials.map((material) => (
                <div
                  key={material.id}
                  onClick={() => loadMaterial(material)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center shadow-sm">
                      <span className="text-xl">📄</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-rose-700 transition-colors">{material.filename}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(material.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                        {material.analyzedTypes && ` • ${(material.analyzedTypes as AnalyzedType[]).length} task types`}
                      </p>
                    </div>
                  </div>
                  <div className="text-rose-500 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Use →
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
          {isUploading ? "Analyzing Document..." : "📊 Analyze & Extract Task Types"}
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
                <h2 className="text-xl font-bold text-white">Analysis Complete!</h2>
                <p className="text-emerald-100 text-sm">
                  {file?.name} • {analyzedTypes.length} task type{analyzedTypes.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
          </div>

          {/* Task Types */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
                <label className="text-sm font-semibold text-gray-800">
                  Select Task Types to Practice
                </label>
              </div>
              <button 
                onClick={resetToUpload}
                className="text-sm text-gray-500 hover:text-rose-600 transition-colors"
              >
                ← New File
              </button>
            </div>
            
            {analyzedTypes.length > 0 ? (
              <div className="grid gap-3">
                {analyzedTypes.map((t, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => toggleType(t.type)}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all duration-200 border-2",
                      selectedTypes.includes(t.type) 
                        ? "border-indigo-500 bg-indigo-50 shadow-md" 
                        : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 mt-0.5 flex items-center justify-center flex-shrink-0 transition-all",
                        selectedTypes.includes(t.type)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-gray-300 bg-white"
                      )}>
                        {selectedTypes.includes(t.type) && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{t.type}</h4>
                        {t.example && (
                          <p className="text-sm text-gray-500 mt-1 italic line-clamp-2">
                            Example: "{t.example}"
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
            {isGeneratingQuiz ? "Generating Tasks..." : "⚡ Generate Similar Tasks"}
          </Button>
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
                  <h2 className="text-xl font-bold text-white">Generated Tasks</h2>
                  <p className="text-violet-100 text-sm">{quiz.length} questions based on your document</p>
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
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Question Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold">{idx + 1}</span>
                    </div>
                    <span className="font-semibold text-gray-700">Question {idx + 1}</span>
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
                <p className="text-lg font-medium text-gray-900 mb-6">{q.question}</p>
                
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
                              ? "border-red-500 bg-red-50"
                              : isSelected
                              ? "border-violet-500 bg-violet-50"
                              : "border-gray-200 hover:border-violet-300 hover:bg-gray-50 cursor-pointer"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0",
                            isRevealed && isCorrect
                              ? "border-green-500 bg-green-500"
                              : isRevealed && isSelected && !isCorrect
                              ? "border-red-500 bg-red-500"
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
                            isRevealed && isSelected && !isCorrect ? "text-red-700" : "text-gray-700"
                          )}>
                            {opt}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <textarea 
                      className="w-full bg-transparent resize-none outline-none text-gray-700 placeholder-gray-400"
                      rows={3}
                      placeholder="Type your answer here..."
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

