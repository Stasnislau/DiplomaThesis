import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./App.css";
import { HOC } from "./components/HOC"; 

function App() {
  return (
    <HOC>
      <RouterProvider router={router} />
    </HOC>
  );
}

export default App;
