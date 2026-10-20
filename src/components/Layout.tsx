import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { Seo } from './Seo';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Seo />
      <Header />
      <main className="flex-1 pt-16 lg:pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
