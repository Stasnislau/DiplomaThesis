import { TopBar } from '../common/TopBar';
import { Outlet } from 'react-router-dom';

function WithTopBar() {
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}

export default WithTopBar;
