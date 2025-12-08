import React, { useState } from "react";
import { useUploadMaterial } from "@/api/hooks/useUploadMaterial";
import { useGenerateQuiz } from "@/api/hooks/useGenerateQuiz";
import Button from "@/components/common/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/Card";
import { QuizQuestion } from "@/api/mutations/generateQuiz";

export const MaterialsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"upload" | "ready" | "quiz">("upload");
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  
  const { mutate: upload, isPending: isUploading, error: uploadError } = useUploadMaterial();
  const { mutate: generateQuizMutation, isPending: isGeneratingQuiz } = useGenerateQuiz();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    upload(file, {
      onSuccess: () => {
        setView("ready");
      }
    });
  };

  const handleGenerateQuiz = () => {
      generateQuizMutation(undefined, {
          onSuccess: (data) => {
              // Check if questions exist
              if (data.quiz && Array.isArray(data.quiz.questions)) {
                  setQuiz(data.quiz.questions);
                  setView("quiz");
              } else {
                  // Fallback or empty state
                  console.error("Unexpected quiz format", data);
              }
          }
      });
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
                  {isUploading ? "Processing..." : "Analyze File"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {view === "ready" && (
            <Card className="text-center p-10">
                <CardContent className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">File Processed Successfully!</h2>
                    <p className="text-gray-600 mb-8 max-w-md">
                        I have analyzed the structure of <strong>{file?.name}</strong>. I can now generate new exercises similar to those found in the document.
                    </p>
                    
                    <Button 
                        onClick={handleGenerateQuiz} 
                        disabled={isGeneratingQuiz}
                        variant="primary"
                        className="px-8 py-3 text-lg h-auto"
                    >
                        {isGeneratingQuiz ? "Generating Tasks..." : "Generate Similar Tasks"}
                    </Button>
                </CardContent>
            </Card>
        )}

        {view === "quiz" && (
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Generated Tasks</h2>
                    <Button variant="secondary" onClick={() => setView("ready")}>Back</Button>
                 </div>
                 
                 {quiz.map((q, idx) => (
                     <Card key={idx}>
                         <CardHeader>
                             <CardTitle className="text-lg flex justify-between">
                                 <span>Task {idx + 1}</span>
                                 {q.type && <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">{q.type}</span>}
                             </CardTitle>
                         </CardHeader>
                         <CardContent>
                             <p className="font-medium text-gray-800 mb-4 text-lg">{q.question}</p>
                             
                             {q.options && q.options.length > 0 ? (
                                 <div className="space-y-2">
                                     {q.options.map((opt, i) => (
                                         <div key={i} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                             <div className="w-4 h-4 rounded-full border border-gray-300 mr-3"></div>
                                             <span>{opt}</span>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 italic text-gray-500">
                                     (Open answer / Fill in the blank)
                                 </div>
                             )}

                             <div className="mt-6">
                                 <details className="group">
                                     <summary className="flex cursor-pointer items-center text-indigo-600 font-medium">
                                         <span className="group-open:hidden">Show Answer</span>
                                         <span className="hidden group-open:inline">Hide Answer</span>
                                     </summary>
                                     <div className="mt-2 p-3 bg-green-50 text-green-800 rounded-lg">
                                         <strong>Correct Answer:</strong> {q.correct_answer}
                                     </div>
                                 </details>
                             </div>
                         </CardContent>
                     </Card>
                 ))}
            </div>
        )}
      </div>
    </div>
  );
};
