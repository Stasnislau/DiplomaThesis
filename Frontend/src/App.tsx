import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import LoadingPage from "./components/layout/Loading";
import "./App.css";

function App() {
  const { refresh, isLoading, initialized } = useAuthStore();

  useEffect(() => {
    refresh();
  }, [refresh]);
  
  if (isLoading || !initialized) {
    return <LoadingPage />;
  }
  return <RouterProvider router={router} />;
}

export default App;
