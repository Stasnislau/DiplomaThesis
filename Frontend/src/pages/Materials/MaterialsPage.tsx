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
import QuestionRenderer, {
  gradeQuestion,
  type UserAnswerValue,
} from "@/pages/Tasks/components/MaterialsRenderers";

/**
 * Map an internal Materials task-type slug to a friendly label and an
 * emoji. The same backend slug is reused for both the type analyser
 * (which detects what's in the uploaded PDF) and the quiz generator
 * (which produces actual questions in those formats), so the renderer
 * also has to handle the analyser's older aliases like
 * `gap_fill_grammar` and `gap_fill_vocab` that map to fill-in-blank.
 */
const MATERIALS_TYPE_LABELS: Record<string, { defaultLabel: string; emoji: string }> = {
  multiple_choice:  { defaultLabel: "Multiple choice",       emoji: "🔘" },
  multi_select_mc:  { defaultLabel: "Multi-select",          emoji: "☑️" },
  true_false:       { defaultLabel: "True / False",          emoji: "⚖️" },
  open:             { defaultLabel: "Open-ended",            emoji: "✏️" },
  fill_in_the_blank:{ defaultLabel: "Fill in the blank",     emoji: "✍️" },
  gap_fill_grammar: { defaultLabel: "Grammar gap-fill",      emoji: "✍️" },
  gap_fill_vocab:   { defaultLabel: "Vocabulary gap-fill",   emoji: "✍️" },
  matching:         { defaultLabel: "Matching",              emoji: "🔗" },
  cloze_passage:    { defaultLabel: "Cloze passage",         emoji: "🧩" },
};
import { useTranslation } from "react-i18next";
import { useUploadMaterial } from "@/api/hooks/useUploadMaterial";

interface AnalyzedType {
  type: string;
  example: string;
}

/** Render a human-readable form of the canonical correct answer for
 *  any of the seven QuizQuestion shapes. Used in the post-submit
 *  feedback banner. */
function summariseCorrectAnswer(q: QuizQuestion): string {
    switch (q.type) {
        case "multiple_choice":
        case "open":
            return q.correct_answer;
        case "fill_in_the_blank":
        case "gap_fill_grammar":
        case "gap_fill_vocab":
            return Array.isArray(q.correct_answer)
                ? q.correct_answer.join(" / ")
                : q.correct_answer;
        case "true_false":
            return q.correct_answer;
        case "matching":
            return q.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
        case "multi_select_mc":
            return q.correct_answers.join(", ");
        case "cloze_passage":
            return q.blanks
                .map((b) =>
                    Array.isArray(b.correct_answer)
                        ? `${b.id}: ${b.correct_answer.join(" / ")}`
                        : `${b.id}: ${b.correct_answer}`,
                )
                .join("; ");
    }
}

export const MaterialsPage: React.FC = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"upload" | "ready" | "quiz">("upload");
  const [analyzedTypes, setAnalyzedTypes] = useState<AnalyzedType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  // UserAnswerValue covers every shape the seven question types can
  // hold: string for MC/open/T-F/FIB, string[] for multi-select, and
  // Record<string,string> for matching pairs and cloze blanks.
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswerValue>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { mutate: upload, isPending: isUploading, error: uploadError, reset: resetUpload } = useUploadMaterial();
  const { mutate: generateQuizMutation, isPending: isGeneratingQuiz, error: quizError, reset: resetQuiz } = useGenerateQuiz();
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
      generateQuizMutation({ selectedTypes }, {
          onSuccess: (data) => {
              const payload = data.quiz;
              if (
                  payload &&
                  typeof payload === "object" &&
                  Array.isArray((payload as { questions?: unknown }).questions)
              ) {
                  setQuiz((payload as { questions: typeof quiz }).questions);
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
                <h1 className="text-3xl font-bold text-gray-900">{t("materialsPage.title")}</h1>
                <p className="mt-2 text-gray-600">{t("materialsPage.subtitle")}</p>
            </div>
            {view !== "upload" && (
                 <Button variant="secondary" onClick={() => setView("upload")} className="text-sm">{t("materialsPage.uploadNewFile")}</Button>
            )}
        </div>

        <Tabs defaultValue="new" className="w-full">
            {view === "upload" && (
                <TabsList className="mb-6 grid w-full grid-cols-2">
                    <TabsTrigger value="new">{t("materialsPage.newUpload")}</TabsTrigger>
                    <TabsTrigger value="saved">{t("tasks.myMaterials")}</TabsTrigger>
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
                        <div
                          role="alert"
                          className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center justify-between gap-3"
                        >
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {uploadError.message || t("materialsPage.uploadFailed")}
                          </p>
                          <button
                            type="button"
                            onClick={() => resetUpload()}
                            className="text-xs font-medium px-2 py-1 rounded text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40"
                          >
                            {t("materialsPage.tryAgain")}
                          </button>
                        </div>
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
                        {isMaterialsLoading && <p className="text-center text-gray-500">{t("materials.loadingMaterials")}</p>}
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
                            {analyzedTypes.map((at, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md",
                                        selectedTypes.includes(at.type)
                                            ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                                            : "border-gray-200 hover:border-indigo-300"
                                    )}
                                    onClick={() => toggleType(at.type)}
                                >
                                    <div className="flex items-start">
                                        <div className={cn(
                                            "w-5 h-5 rounded border mt-1 mr-3 flex items-center justify-center flex-shrink-0 transition-colors",
                                            selectedTypes.includes(at.type)
                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                : "border-gray-300 bg-white"
                                        )}>
                                            {selectedTypes.includes(at.type) && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <span aria-hidden="true">{MATERIALS_TYPE_LABELS[at.type]?.emoji || "❓"}</span>
                                                <span>
                                                    {t(`materialsPage.questionType.${at.type}`, {
                                                        defaultValue: MATERIALS_TYPE_LABELS[at.type]?.defaultLabel || at.type,
                                                    })}
                                                </span>
                                            </h4>
                                            {at.example && <p className="text-sm text-gray-500 mt-1 italic">"{at.example}"</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg mb-6">
                            {t("materialsPage.noTypesIdentified")}
                        </div>
                    )}
                    
                    {quizError && (
                        <div
                            role="alert"
                            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center justify-between gap-3"
                        >
                            <p className="text-sm text-red-700 dark:text-red-300">
                                {quizError.message || t("materialsPage.quizGenerationFailed")}
                            </p>
                            <button
                                type="button"
                                onClick={() => resetQuiz()}
                                className="text-xs font-medium px-2 py-1 rounded text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40"
                            >
                                {t("materialsPage.tryAgain")}
                            </button>
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
                                 Score: {quiz.filter((q, i) => gradeQuestion(q, userAnswers[i]) === true).length} / {quiz.length}
                             </div>
                        )}
                        <Button variant="secondary" onClick={() => setView("ready")}>Exit</Button>
                    </div>
                 </div>
                 
                 {quiz.map((q, idx) => {
                     const graded = isSubmitted ? gradeQuestion(q, userAnswers[idx]) : null;
                     const isCorrect = graded === true ? true : graded === false ? false : undefined;

                     return (
                     <Card key={idx} className={cn(
                         "transition-colors border-2",
                         isSubmitted && isCorrect === true ? "border-green-200 bg-green-50/30" : "",
                         isSubmitted && isCorrect === false ? "border-red-200 bg-red-50/30" : "border-transparent"
                     )}>
                         <CardHeader>
                             <CardTitle className="text-lg flex justify-between items-start">
                                 <div className="flex flex-col gap-1">
                                    <span>{t("materialsPage.questionLabel", { n: idx + 1 })}</span>
                                    {q.type && (
                                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit inline-flex items-center gap-1">
                                            <span aria-hidden="true">{MATERIALS_TYPE_LABELS[q.type]?.emoji || "❓"}</span>
                                            <span>
                                                {t(`materialsPage.questionType.${q.type}`, {
                                                    defaultValue: MATERIALS_TYPE_LABELS[q.type]?.defaultLabel || q.type,
                                                })}
                                            </span>
                                        </span>
                                    )}
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

                             {/* Dispatcher renders the right component for every
                                 question type — MC, multi-select, T/F, open,
                                 fill-in-blank, matching, cloze passage. The
                                 inline-MC-only path that lived here before
                                 silently mis-rendered the four other shapes. */}
                             <QuestionRenderer
                                 question={q}
                                 answer={userAnswers[idx]}
                                 onChange={(answer) =>
                                     !isSubmitted &&
                                     setUserAnswers((prev) => ({ ...prev, [idx]: answer }))
                                 }
                                 revealed={isSubmitted}
                             />

                             {isSubmitted && isCorrect === false && (
                                 <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg border border-red-100">
                                     <strong>{t("tasks.correctAnswer", { defaultValue: "Correct answer:" })}</strong>{" "}
                                     {summariseCorrectAnswer(q)}
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
