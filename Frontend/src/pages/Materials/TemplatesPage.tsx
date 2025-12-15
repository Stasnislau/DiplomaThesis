import React, { useMemo, useState } from "react";
import { useGetTaskTemplates } from "@/api/hooks/useGetTaskTemplates";
import { useGenerateTaskFromTemplate } from "@/api/hooks/useGenerateTaskFromTemplate";
import { useUploadMaterial } from "@/api/hooks/useUploadMaterial";
import { TaskTemplate } from "@/types/models/TaskTemplate";
import Button from "@/components/common/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/Card";
import { Modal } from "@/components/common/Modal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import TextField from "@/components/common/TextField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/Select";

const TemplatesPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [generatedTask, setGeneratedTask] = useState<any | null>(null);
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState("B1");
  const [file, setFile] = useState<File | null>(null);
  const [uploadInfo, setUploadInfo] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");

  const { data: templates, isLoading, refetch } = useGetTaskTemplates(search);
  const { mutateAsync: generateTask, isPending: isGenerating } = useGenerateTaskFromTemplate();
  const { mutateAsync: uploadMaterial, isPending: isUploading } = useUploadMaterial();

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    const result = await generateTask({
      templateId: selectedTemplate.id,
      language,
      level,
    });
    setGeneratedTask(result.task);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadInfo("");
    setUploadError("");
    try {
      const res = await uploadMaterial(file);
      setUploadInfo(
        `Uploaded ${res.filename} (chunks: ${res.chunks_count}, templates: ${res.templates_extracted ?? 0})`
      );
      setFile(null);
      await refetch();
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed");
    }
  };

  const templatesList = useMemo(() => templates || [], [templates]);

  const languageOptions = [
    "English",
    "Spanish",
    "French",
    "German",
    "Italian",
    "Russian",
    "Polish",
  ];

  const levelOptions = ["A1", "A2", "B1", "B2", "C1", "C2"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Templates Lab</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Task templates</h1>
            <p className="text-gray-600">Загружай PDF, вытаскивай паттерны заданий и мгновенно генерируй новые задачи.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload & Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <Button variant="secondary" disabled={!file || isUploading} onClick={handleUpload}>
                  {isUploading ? "Uploading..." : "Upload PDF"}
                </Button>
              </div>
              <div className="flex gap-2 items-center w-full md:w-auto">
                <TextField
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full md:w-64"
                />
                <Button variant="primary" onClick={() => refetch()}>
                  Search
                </Button>
              </div>
            </div>
            {(uploadInfo || uploadError) && (
              <div
                className={`rounded border px-3 py-2 text-sm ${
                  uploadError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {uploadError || uploadInfo}
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : templatesList.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-10 text-gray-500">
              Пока нет шаблонов. Загрузите PDF, чтобы извлечь паттерны заданий.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templatesList.map((tpl) => (
              <Card key={tpl.id} className="h-full flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex justify-between items-start gap-2">
                    <span className="font-semibold text-gray-800 line-clamp-2">{tpl.template}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                      {tpl.task_type || "mixed"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 text-sm text-gray-700">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="font-semibold">Answer: {tpl.answer_type || "open"}</span>
                    {tpl.source && <span className="truncate max-w-[50%]">Source: {tpl.source}</span>}
                  </div>
                  {tpl.example && (
                    <div className="bg-gray-50 border rounded p-2 text-xs text-gray-600">
                      <div className="font-semibold mb-1">Example</div>
                      <div className="line-clamp-4">{tpl.example}</div>
                    </div>
                  )}
                  <div className="mt-auto pt-2">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setSelectedTemplate(tpl);
                        setGeneratedTask(null);
                      }}
                    >
                      Generate task
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={selectedTemplate !== null}
        onClose={() => {
          setSelectedTemplate(null);
          setGeneratedTask(null);
        }}
        title="Generate task from template"
        description={selectedTemplate?.template}
        className="max-w-2xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600">Language</p>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600">Level</p>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
          {generatedTask && (
            <div className="bg-gray-50 border rounded p-3 max-h-80 overflow-auto text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(generatedTask, null, 2)}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TemplatesPage;

