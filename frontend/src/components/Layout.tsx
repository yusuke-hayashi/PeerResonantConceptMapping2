import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Navigation } from './Navigation';

/**
 * Main layout component with header, navigation, and content area
 */
export function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Navigation />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
