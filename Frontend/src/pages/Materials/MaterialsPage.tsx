import React, { useState } from "react";
import { useUploadMaterial } from "@/api/hooks/useUploadMaterial";
import { useGenerateQuiz } from "@/api/hooks/useGenerateQuiz";
import { useSaveMaterial } from "@/api/hooks/useSaveMaterial";
import { useGetUserMaterials } from "@/api/hooks/useGetUserMaterials";
import Button from "@/components/common/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/Card";
import { QuizQuestion } from "@/api/mutations/generateQuiz";
import cn from "@/utils/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";

interface AnalyzedType {
  type: string;
  example: string;
}

export const MaterialsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"upload" | "ready" | "quiz">("upload");
  const [analyzedTypes, setAnalyzedTypes] = useState<AnalyzedType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  
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
                  setView("quiz");
              } else {
                  console.error("Unexpected quiz format", data);
              }
          }
      });
  };

  const loadMaterial = (material: any) => {
      setFile({ name: material.filename } as File); // Mock file object just for display name
      
      // Ensure analyzedTypes is an array of objects
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
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Generated Tasks</h2>
                    <Button variant="secondary" onClick={() => setView("ready")}>Back to Options</Button>
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
