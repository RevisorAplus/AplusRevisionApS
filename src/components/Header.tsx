import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const navLinks = [
    { to: '/', label: t.nav.home },
    { to: '/services', label: t.nav.services },
    { to: '/pricing', label: t.nav.pricing },
    { to: '/skat-deadlines', label: t.nav.skatDeadlines },
    { to: '/about', label: t.nav.about },
    { to: '/contact', label: t.nav.contact },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-gray-900 shadow-md' : 'bg-gray-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={`${import.meta.env.BASE_URL}a+_revision_logo_design.png`}
              alt="A+ Revision"
              className="h-12 lg:h-14 w-auto"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setLanguage('da')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'da'
                    ? 'bg-primary-600 text-white'
                    : 'bg-transparent text-gray-300 hover:bg-gray-800'
                }`}
              >
                DA
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-primary-600 text-white'
                    : 'bg-transparent text-gray-300 hover:bg-gray-800'
                }`}
              >
                EN
              </button>
            </div>
            <Link
              to="/contact"
              className="bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {t.nav.bookMeeting}
            </Link>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden bg-gray-900 border-t border-gray-800">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`block py-2 text-base font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex items-center gap-4 border-t border-gray-800">
              <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setLanguage('da')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    language === 'da'
                      ? 'bg-primary-600 text-white'
                      : 'bg-transparent text-gray-300'
                  }`}
                >
                  DA
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    language === 'en'
                      ? 'bg-primary-600 text-white'
                      : 'bg-transparent text-gray-300'
                  }`}
                >
                  EN
                </button>
              </div>
              <Link
                to="/contact"
                className="flex-1 bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium text-center hover:bg-primary-700 transition-colors"
              >
                {t.nav.bookMeeting}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
