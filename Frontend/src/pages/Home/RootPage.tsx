import { useAuthStore } from "@/store/useAuthStore";
import { HomePage } from "./HomePage";
import { LandingPage } from "./LandingPage";

export const RootPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <HomePage />;
  } else {
    return <LandingPage />;
  }
};
