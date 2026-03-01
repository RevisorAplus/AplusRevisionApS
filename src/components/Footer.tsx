import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link to="/" className="inline-block mb-4">
              <img
                src="/a+_revision_logo_design.png"
                alt="A+ Revision"
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.services}</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/services/bookkeeping" className="text-sm hover:text-accent-400 transition-colors">
                  {t.services.bookkeeping.title}
                </Link>
              </li>
              <li>
                <Link to="/services/annual-accounts" className="text-sm hover:text-accent-400 transition-colors">
                  {t.services.annualAccounts.title}
                </Link>
              </li>
              <li>
                <Link to="/services/tax-returns" className="text-sm hover:text-accent-400 transition-colors">
                  {t.services.taxReturns.title}
                </Link>
              </li>
              <li>
                <Link to="/services/vat" className="text-sm hover:text-accent-400 transition-colors">
                  {t.services.vat.title}
                </Link>
              </li>
              <li>
                <Link to="/services/advisory" className="text-sm hover:text-accent-400 transition-colors">
                  {t.services.advisory.title}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.company}</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-sm hover:text-accent-400 transition-colors">
                  {t.nav.about}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm hover:text-accent-400 transition-colors">
                  {t.nav.pricing}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm hover:text-accent-400 transition-colors">
                  {t.nav.contact}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.contact}</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <Phone className="w-6 h-6 text-accent-500 flex-shrink-0" />
                <span>+45 50 29 51 59</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail className="w-6 h-6 text-accent-500 flex-shrink-0" />
                <span>Info.aplusrevision@gmail.com</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                <span>Copenhagen, Denmark</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} A+ Revision ApS. {t.footer.rights}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                CVR: 46292170
              </p>
            </div>
            <p className="text-xs text-gray-600">
              {t.footer.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
