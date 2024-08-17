import { RouterProvider } from 'react-router-dom';
import { useModeState } from './store/useUserConfigStore';
import Spinner from './components/common/Spinner';
import { router } from './router';

function App() {
  const { mode } = useModeState();

  if (mode === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  // if (!instance || !isInitialized) {
  //   return (
  //     <div className="flex items-center justify-center h-screen dark:bg-black">
  //       <Spinner size={32} />
  //     </div>
  //   );
  // }

  return <RouterProvider router={router} />;
}

export default App;
