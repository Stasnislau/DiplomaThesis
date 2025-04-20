import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useEffect, useState } from "react";
import { useAuthStore } from "./store/useAuthStore";
import LoadingPage from "./components/layout/Loading";
import "./App.css";

function App() {
  const { refresh, isLoading: authLoading, initialized: authInitialized } = useAuthStore();
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  useEffect(() => {
    if (!authInitialized && !hasAttemptedRefresh) {
      setHasAttemptedRefresh(true);
      refresh();
    }
  }, [authInitialized, hasAttemptedRefresh]);

  if (authLoading || !authInitialized) {
    return <LoadingPage />;
  }
  
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
