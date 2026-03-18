import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/Card";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";

import Button from "@/components/common/Button";
import { QuizQuestion } from "@/api/mutations/generateQuiz";
import { UserMaterial } from "@/api/mutations/saveMaterial";
import cn from "@/utils/cn";
import { useGenerateQuiz } from "@/api/hooks/useGenerateQuiz";
import { useGetUserMaterials } from "@/api/hooks/useGetUserMaterials";
import { useSaveMaterial } from "@/api/hooks/useSaveMaterial";
import { useUploadMaterial } from "@/api/hooks/useUploadMaterial";

interface AnalyzedType {
  type: string;
  example: string;
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const isAnswerCorrect = (user: string, correct: string) => {
    if (!user) return false;
    const u = user.toLowerCase().trim().replace(/[.,!?;:]/g, "");
    const c = correct.toLowerCase().trim().replace(/[.,!?;:]/g, "");
    if (u === c) return true;
    const threshold = c.length > 6 ? 2 : (c.length > 3 ? 1 : 0);
    return levenshtein(u, c) <= threshold;
};

export const MaterialsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"upload" | "ready" | "quiz">("upload");
  const [analyzedTypes, setAnalyzedTypes] = useState<AnalyzedType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
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
                  setUserAnswers({});
                  setIsSubmitted(false);
                  setView("quiz");
              } else {
                  console.error("Unexpected quiz format", data);
              }
          }
      });
  };



  const loadMaterial = (material: UserMaterial) => {
      setFile({ name: material.filename } as File); 
      
      let types: AnalyzedType[] = [];
      if (Array.isArray(material.analyzedTypes)) {
          types = material.analyzedTypes.map((t: AnalyzedType | string) => {
              if (typeof t === 'string') return { type: t, example: '' };
              return t;
          });
      }
      setAnalyzedTypes(types);
      setSelectedTypes(types.map(t => t.type));
      setView("ready");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Task Generator</h1>
                <p className="mt-2 text-gray-600">Upload a document, and I'll generate similar exercises for you.</p>
            </div>
            {view !== "upload" && (
                 <Button variant="secondary" onClick={() => setView("upload")} className="text-sm">Upload New File</Button>
            )}
        </div>

        <Tabs defaultValue="new" className="w-full">
            {view === "upload" && (
                <TabsList className="mb-6 grid w-full grid-cols-2">
                    <TabsTrigger value="new">New Upload</TabsTrigger>
                    <TabsTrigger value="saved">My Materials</TabsTrigger>
                </TabsList>
            )}

            <TabsContent value="new">
                {view === "upload" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Upload Material (PDF)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-lg font-medium text-gray-700">
                            {file ? file.name : "Click to select PDF file"}
                          </span>
                          <span className="text-sm text-gray-500 mt-2">Max size 10MB</span>
                        </label>
                      </div>
                      
                      {uploadError && (
                        <p className="text-red-500 mt-4 text-center">{uploadError.message}</p>
                      )}

                      <div className="mt-6 flex justify-end">
                        <Button 
                          onClick={handleUpload} 
                          disabled={!file || isUploading}
                          variant="primary"
                        >
                          {isUploading ? "Analyzing Structure..." : "Analyze File"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </TabsContent>

            <TabsContent value="saved">
                {view === "upload" && (
                    <div className="space-y-4">
                        {isMaterialsLoading && <p className="text-center text-gray-500">Loading your materials...</p>}
                        {userMaterials?.length === 0 && <p className="text-center text-gray-500">No saved materials yet.</p>}
                        {userMaterials?.map((material) => (
                            <Card 
                                key={material.id} 
                                className="cursor-pointer hover:border-indigo-300 transition-all hover:shadow-md"
                                onClick={() => loadMaterial(material)}
                            >
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center mr-4">
                                            <span className="text-xl">📄</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{material.filename}</h3>
                                            <p className="text-sm text-gray-500">
                                                {new Date(material.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-indigo-600 font-medium text-sm">
                                        Open →
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>

        {view === "ready" && (
            <Card className="p-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <span className="bg-green-100 text-green-700 p-2 rounded-lg mr-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                        Analysis Complete
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-6">
                        I found the following types of exercises in <strong>{file?.name}</strong>. Select the ones you want to practice:
                    </p>
                    
                    {analyzedTypes.length > 0 ? (
                        <div className="grid gap-4 mb-8">
                            {analyzedTypes.map((t, idx) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md",
                                        selectedTypes.includes(t.type) 
                                            ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" 
                                            : "border-gray-200 hover:border-indigo-300"
                                    )}
                                    onClick={() => toggleType(t.type)}
                                >
                                    <div className="flex items-start">
                                        <div className={cn(
                                            "w-5 h-5 rounded border mt-1 mr-3 flex items-center justify-center flex-shrink-0 transition-colors",
                                            selectedTypes.includes(t.type)
                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                : "border-gray-300 bg-white"
                                        )}>
                                            {selectedTypes.includes(t.type) && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{t.type}</h4>
                                            {t.example && <p className="text-sm text-gray-500 mt-1 italic">"{t.example}"</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg mb-6">
                            I couldn't identify specific exercise types, but I can still try to generate tasks based on the content.
                        </div>
                    )}
                    
                    <div className="flex justify-end">
                        <Button 
                            onClick={handleGenerateQuiz} 
                            disabled={isGeneratingQuiz || (analyzedTypes.length > 0 && selectedTypes.length === 0)}
                            variant="primary"
                            className="px-8 py-3 h-auto"
                        >
                            {isGeneratingQuiz ? "Generating Tasks..." : "Generate Similar Tasks"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}

        {view === "quiz" && (
            <div className="space-y-6 pb-20">
                 <div className="flex justify-between items-center sticky top-0 bg-gray-50 z-10 py-4 shadow-sm px-2">
                    <h2 className="text-2xl font-bold">Quiz</h2>
                    <div className="flex gap-4 items-center">
                        {isSubmitted && (
                             <div className="text-lg font-bold">
                                 Score: {quiz.filter((q, i) => isAnswerCorrect(userAnswers[i], q.correct_answer)).length} / {quiz.length}
                             </div>
                        )}
                        <Button variant="secondary" onClick={() => setView("ready")}>Exit</Button>
                    </div>
                 </div>
                 
                 {quiz.map((q, idx) => {
                     const isCorrect = isSubmitted ? isAnswerCorrect(userAnswers[idx], q.correct_answer) : undefined;
                     
                     return (
                     <Card key={idx} className={cn(
                         "transition-colors border-2",
                         isSubmitted && isCorrect === true ? "border-green-200 bg-green-50/30" : "",
                         isSubmitted && isCorrect === false ? "border-red-200 bg-red-50/30" : "border-transparent"
                     )}>
                         <CardHeader>
                             <CardTitle className="text-lg flex justify-between items-start">
                                 <div className="flex flex-col gap-1">
                                    <span>Question {idx + 1}</span>
                                    {q.type && <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">{q.type}</span>}
                                 </div>
                                 {isSubmitted && (
                                     <span className={cn(
                                         "text-sm font-bold px-3 py-1 rounded-full",
                                         isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                     )}>
                                         {isCorrect ? "Correct" : "Incorrect"}
                                     </span>
                                 )}
                             </CardTitle>
                         </CardHeader>
                         <CardContent>
                             {q.context_text && (
                                 <div className="mb-6 p-4 bg-indigo-50/50 rounded-lg border-l-4 border-indigo-400">
                                     <p className="text-sm text-gray-800 italic leading-relaxed whitespace-pre-line">{q.context_text}</p>
                                 </div>
                             )}

                             <p className="font-medium text-gray-800 mb-6 text-lg">{q.question}</p>
                             
                             {q.options && q.options.length > 0 ? (
                                 <div className="space-y-3">
                                     {q.options.map((opt, i) => (
                                         <label key={i} className={cn(
                                             "flex items-center p-4 border rounded-xl cursor-pointer transition-all",
                                             userAnswers[idx] === opt 
                                                ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" 
                                                : "border-gray-200 hover:bg-gray-50",
                                             isSubmitted && q.correct_answer === opt ? "border-green-500 bg-green-100 ring-1 ring-green-500" : ""
                                         )}>
                                             <input 
                                                 type="radio" 
                                                 name={`q-${idx}`} 
                                                 value={opt}
                                                 checked={userAnswers[idx] === opt}
                                                 onChange={() => !isSubmitted && setUserAnswers(prev => ({...prev, [idx]: opt}))}
                                                 disabled={isSubmitted}
                                                 className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 disabled:opacity-50"
                                             />
                                             <span className="ml-3 text-gray-700">{opt}</span>
                                         </label>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="space-y-4">
                                     <input
                                         type="text"
                                         placeholder="Your answer..."
                                         value={userAnswers[idx] || ""}
                                         onChange={(e) => !isSubmitted && setUserAnswers(prev => ({...prev, [idx]: e.target.value}))}
                                         disabled={isSubmitted}
                                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                     />
                                 </div>
                             )}

                             {isSubmitted && !isCorrect && (
                                 <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg border border-red-100">
                                     <strong>Correct Answer:</strong> {q.correct_answer}
                                 </div>
                             )}
                         </CardContent>
                     </Card>
                 )})}

                 {!isSubmitted && (
                     <div className="flex justify-end pt-4">
                         <Button 
                            variant="primary" 
                            onClick={() => setIsSubmitted(true)}
                            className="w-full sm:w-auto px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                            disabled={Object.keys(userAnswers).length < quiz.length}
                         >
                            Submit Answers
                         </Button>
                     </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
};
