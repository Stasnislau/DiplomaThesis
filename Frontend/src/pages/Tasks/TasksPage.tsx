import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";
import WritingTask from "./components/WritingTask";
import SpeakingTask from "./components/SpeakingTask";
import ListeningTask from "./components/ListeningTask";

const TasksPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Tasks</h1>
      <Tabs defaultValue="writing">
        <TabsList>
          <TabsTrigger value="writing">Writing</TabsTrigger>
          <TabsTrigger value="speaking">Speaking</TabsTrigger>
          <TabsTrigger value="listening">Listening</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default TasksPage;
