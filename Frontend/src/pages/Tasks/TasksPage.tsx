import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";
import WritingTask from "./components/WritingTask";
import SpeakingTask from "./components/SpeakingTask";
import ListeningTask from "./components/ListeningTask";
import MaterialsTask from "./components/MaterialsTask";
import { Link, useNavigate } from "react-router-dom";

const TasksPage = () => {
  const navigate = useNavigate();

  const shortcuts = [
    {
      title: "Quiz",
      description: "Test your knowledge",
      path: "/quiz",
      icon: "🧩",
      bgColor: "bg-green-50",
      iconBg: "bg-green-100",
      hoverBg: "hover:bg-green-100",
      borderColor: "border-green-200",
    },
    {
      title: "Speech Analysis",
      description: "Analyze pronunciation",
      path: "/speech-analysis",
      icon: "🎙️",
      bgColor: "bg-orange-50",
      iconBg: "bg-orange-100",
      hoverBg: "hover:bg-orange-100",
      borderColor: "border-orange-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors duration-200 mb-6 group"
        >
          <span className="text-lg transition-transform duration-200 group-hover:-translate-x-1">←</span>
          <span className="font-medium">Back to Home</span>
        </Link>

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <span className="text-white text-2xl">📝</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Practice Tasks</h1>
              <p className="text-gray-500">Improve your writing, speaking, listening, and reading skills</p>
            </div>
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.path}
                onClick={() => navigate(shortcut.path)}
                className={`${shortcut.bgColor} ${shortcut.hoverBg} border ${shortcut.borderColor} rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${shortcut.iconBg} w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <span className="text-xl">{shortcut.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{shortcut.title}</h3>
                    <p className="text-xs text-gray-500">{shortcut.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Tabs */}
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <Tabs defaultValue="writing" className="w-full">
            <TabsList className="w-full grid grid-cols-4 gap-2 bg-gray-100 p-1.5 rounded-xl mb-6">
              <TabsTrigger 
                value="writing" 
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600"
              >
                <span className="mr-1.5">✍️</span>
                Writing
              </TabsTrigger>
              <TabsTrigger 
                value="speaking"
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600"
              >
                <span className="mr-1.5">🗣️</span>
                Speaking
              </TabsTrigger>
              <TabsTrigger 
                value="listening"
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600"
              >
                <span className="mr-1.5">👂</span>
                Listening
              </TabsTrigger>
              <TabsTrigger 
                value="materials"
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-rose-600"
              >
                <span className="mr-1.5">📄</span>
                PDF Tasks
              </TabsTrigger>
            </TabsList>
            <TabsContent value="writing">
              <WritingTask />
            </TabsContent>
            <TabsContent value="speaking">
              <SpeakingTask />
            </TabsContent>
            <TabsContent value="listening">
              <ListeningTask />
            </TabsContent>
            <TabsContent value="materials">
              <MaterialsTask />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
