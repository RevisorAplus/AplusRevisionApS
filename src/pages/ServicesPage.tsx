import { BookOpen, FileText, Receipt, Calculator, Lightbulb } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ServiceCard } from '../components/ServiceCard';

export function ServicesPage() {
  const { t } = useLanguage();

  const services = [
    {
      icon: BookOpen,
      title: t.services.bookkeeping.title,
      description: t.services.bookkeeping.shortDesc,
      price: '895 DKK',
      priceUnit: t.services.perMonth,
      link: '/services/bookkeeping',
    },
    {
      icon: FileText,
      title: t.services.annualAccounts.title,
      description: t.services.annualAccounts.shortDesc,
      price: '4.995 DKK',
      link: '/services/annual-accounts',
    },
    {
      icon: Receipt,
      title: t.services.taxReturns.title,
      description: t.services.taxReturns.shortDesc,
      link: '/services/tax-returns',
    },
    {
      icon: Calculator,
      title: t.services.vat.title,
      description: t.services.vat.shortDesc,
      link: '/services/vat',
    },
    {
      icon: Lightbulb,
      title: t.services.advisory.title,
      description: t.services.advisory.shortDesc,
      price: '495 DKK',
      priceUnit: t.services.perHour,
      link: '/services/advisory',
    },
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-gray-50 via-white to-primary-50/30 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.services.title}</h1>
            <p className="text-xl text-gray-600">{t.services.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <ServiceCard key={index} {...service} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
