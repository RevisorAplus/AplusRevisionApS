import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, FileText, Receipt, Calculator, Lightbulb, Users,
  Check, ArrowRight, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ContactForm } from '../components/ContactForm';

type ServiceKey = 'bookkeeping' | 'annualAccounts' | 'taxReturns' | 'vat' | 'advisory' | 'salary';

const serviceIcons: Record<ServiceKey, typeof BookOpen> = {
  bookkeeping: BookOpen,
  annualAccounts: FileText,
  taxReturns: Receipt,
  vat: Calculator,
  advisory: Lightbulb,
  salary: Users,
};

const serviceKeys: Record<string, ServiceKey> = {
  'bookkeeping': 'bookkeeping',
  'annual-accounts': 'annualAccounts',
  'tax-returns': 'taxReturns',
  'vat': 'vat',
  'advisory': 'advisory',
  'salary': 'salary',
};

const servicePrices: Record<ServiceKey, { price?: string; unit?: string }> = {
  bookkeeping: { price: '895 DKK', unit: '/ month' },
  annualAccounts: { price: '4.995 DKK' },
  taxReturns: {},
  vat: {},
  advisory: { price: '495 DKK', unit: '/ hour' },
  salary: { price: '195 DKK', unit: '/ employee' },
};

export function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();

  const serviceKey = slug ? serviceKeys[slug] : undefined;

  if (!serviceKey) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h1>
          <Link to="/services" className="text-primary-600 hover:text-primary-700">
            Back to services
          </Link>
        </div>
      </div>
    );
  }

  const service = t.services[serviceKey];
  const Icon = serviceIcons[serviceKey];
  const pricing = servicePrices[serviceKey];

  return (
    <>
      <section className="bg-gradient-to-br from-gray-50 via-white to-primary-50/30 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.services.title}
          </Link>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-6">
                <Icon className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{service.title}</h1>
              <p className="text-xl text-gray-600 mb-6">{service.description}</p>
              {pricing.price && (
                <div className="bg-primary-50 rounded-xl p-6 inline-block">
                  <p className="text-sm text-primary-700 mb-1">{t.pricing.startingFrom}</p>
                  <p className="text-3xl font-bold text-primary-900">
                    {pricing.price}
                    {pricing.unit && <span className="text-lg font-normal text-primary-700"> {pricing.unit}</span>}
                  </p>
                </div>
              )}
              {'pricing' in service && (
                <p className="text-gray-600 mt-4 italic">{service.pricing}</p>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">{t.services.getQuote}</h2>
              <ContactForm source={`service_${serviceKey}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t.services.whatIsIncluded}
              </h2>
              <ul className="space-y-4">
                {service.includes.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {serviceKey === 'bookkeeping' ? t.services.forWhom : t.services.whoIsThisFor}
              </h2>
              <p className="text-gray-600 leading-relaxed">{service.whoFor}</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {serviceKey === 'bookkeeping' ? t.services.process : t.services.howItWorks}
              </h2>
              <p className="text-gray-600 leading-relaxed">{service.process}</p>
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
