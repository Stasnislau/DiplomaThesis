import React, { useState } from 'react';

export const SpeechAnalysisPage: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAudioFile(event.target.files[0]);
      setAnalysisResult(''); // Clear previous results
    }
  };

  const handleAnalyzeClick = () => {
    if (!audioFile) {
      setAnalysisResult("Please upload an audio file first.");
      return;
    }

    setIsLoading(true);
    setAnalysisResult(''); // Clear previous results and prepare for new analysis

    // TODO: Implement actual API call to backend for speech analysis
    // For now, we'll just simulate a delay and a placeholder message
    setTimeout(() => {
      setAnalysisResult("Analysis complete. [Placeholder for actual results]");
      setIsLoading(false);
    }, 1000); // Simulate a short delay
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Speech Analysis
      </h1>

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <label htmlFor="audioFile" className="block text-lg font-medium text-gray-700 mb-2">
            Upload Audio File:
          </label>
          <input
            type="file"
            id="audioFile"
            accept="audio/*"
            onChange={handleAudioFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {audioFile && <p className="mt-2 text-sm text-gray-600">File selected: {audioFile.name}</p>}
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => alert("Recording feature will be implemented soon.")}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
          >
            Record Audio (Coming Soon)
          </button>
        </div>

        <div className="mb-8">
          <button
            type="button"
            onClick={handleAnalyzeClick}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline disabled:opacity-50 transition duration-150 ease-in-out"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Speech'}
          </button>
        </div>

        {analysisResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Analysis Result:</h2>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-white p-3 rounded-md border border-gray-200">{analysisResult}</pre>
          </div>
        )}
      </div>
       <p className="text-center mt-8 text-sm text-gray-500">
        Please upload an audio file to begin the analysis.
      </p>
    </div>
  );
};
