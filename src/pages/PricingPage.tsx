import { Link } from 'react-router-dom';
import { BookOpen, FileText, Receipt, Calculator, Lightbulb, Check, ArrowRight, Info } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function PricingPage() {
  const { t, language } = useLanguage();

  const pricingItems = [
    {
      icon: FileText,
      title: t.services.annualAccounts.title,
      description: t.services.annualAccounts.shortDesc,
      price: '4.995 DKK',
      unit: '',
      features: t.services.annualAccounts.includes,
      popular: false,
      link: '/services/annual-accounts',
    },
    {
      icon: BookOpen,
      title: t.services.bookkeeping.title,
      description: t.services.bookkeeping.shortDesc,
      price: '895 DKK',
      unit: t.services.perMonth,
      features: t.services.bookkeeping.includes,
      popular: true,
      link: '/services/bookkeeping',
    },
    {
      icon: Lightbulb,
      title: t.services.advisory.title,
      description: t.services.advisory.shortDesc,
      price: '495 DKK',
      unit: t.services.perHour,
      features: t.services.advisory.includes,
      popular: false,
      link: '/services/advisory',
    },
  ];

  const additionalServices = [
    {
      icon: Receipt,
      title: t.services.taxReturns.title,
      description: t.services.taxReturns.shortDesc,
      pricing: language === 'da' ? 'Pris efter aftale' : 'Price by agreement',
      link: '/services/tax-returns',
    },
    {
      icon: Calculator,
      title: t.services.vat.title,
      description: t.services.vat.pricing || t.services.vat.shortDesc,
      pricing: t.services.vat.pricing || (language === 'da' ? 'Inkluderet eller efter aftale' : 'Included or by agreement'),
      link: '/services/vat',
    },
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-gray-50 via-white to-primary-50/30 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.pricing.title}</h1>
            <p className="text-xl text-gray-600">{t.pricing.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {pricingItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className={`relative bg-white rounded-2xl p-8 ${
                    item.popular
                      ? 'border-2 border-primary-500 shadow-xl ring-1 ring-primary-500/20'
                      : 'border border-gray-200 shadow-sm'
                  }`}
                >
                  {item.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary-600 text-white text-sm font-medium px-4 py-1.5 rounded-full">
                        {t.pricing.mostPopular}
                      </span>
                    </div>
                  )}
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-6">{item.description}</p>
                  <div className="mb-6">
                    <span className="text-sm text-gray-500">{t.pricing.startingFrom}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{item.price}</span>
                      {item.unit && <span className="text-gray-500">{item.unit}</span>}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {item.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={item.link}
                    className={`block text-center py-3 rounded-lg font-medium transition-colors ${
                      item.popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {t.services.learnMore}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {language === 'da' ? 'Andre ydelser' : 'Other services'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {additionalServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link
                  key={index}
                  to={service.link}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{service.description}</p>
                      <p className="text-primary-600 font-medium text-sm">{service.pricing}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  {t.pricing.whatDeterminesPrice}
                </h3>
                <p className="text-amber-800 leading-relaxed">
                  {t.pricing.priceFactors}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t.hero.headline}</h2>
          <p className="text-primary-100 mb-8">{t.hero.subheadline}</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
          >
            {t.hero.primaryCta}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
