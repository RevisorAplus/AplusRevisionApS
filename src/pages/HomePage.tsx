import { Link } from 'react-router-dom';
import {
  BookOpen, FileText, Lightbulb,
  ArrowRight, Phone, Mail, Clock, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ServiceCard } from '../components/ServiceCard';
import { FAQ } from '../components/FAQ';
import { ContactForm } from '../components/ContactForm';
import { LogoSections } from '../components/LogoSections';

export function HomePage() {
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
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-accent-50/30 pt-12 pb-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-100/30 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8">
              <img
                src="/a+_revision_logo_design.png"
                alt="A+ Revision ApS"
                className="h-32 sm:h-40 lg:h-48 w-auto mx-auto mb-4"
              />
              <div className="h-1 w-24 bg-gradient-to-r from-primary-600 to-accent-500 rounded-full mx-auto"></div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-900 leading-tight mb-6">
              {t.hero.headline}
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              {t.hero.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30"
              >
                {t.hero.primaryCta}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/contact?type=quote"
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold border border-gray-200 hover:border-accent-300 hover:bg-accent-50 transition-all"
              >
                {t.hero.secondaryCta}
              </Link>
            </div>
            <p className="text-sm text-gray-500">{t.hero.trustText}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.services.title}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t.services.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <ServiceCard key={index} {...service} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              {t.services.viewAll}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.howItWorks.title}</h2>
            <p className="text-gray-600">{t.howItWorks.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.howItWorks.steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mb-4">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-accent-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">{t.pricing.title}</h2>
            <p className="text-primary-100">{t.pricing.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <FileText className="w-10 h-10 text-white mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t.services.annualAccounts.title}</h3>
              <p className="text-primary-100 text-sm mb-4">{t.pricing.startingFrom}</p>
              <p className="text-3xl font-bold text-white">4.995 DKK</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-xl transform lg:scale-105">
              <div className="inline-block bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {t.pricing.mostPopular}
              </div>
              <BookOpen className="w-10 h-10 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.services.bookkeeping.title}</h3>
              <p className="text-gray-500 text-sm mb-4">{t.pricing.startingFrom}</p>
              <p className="text-3xl font-bold text-gray-900">895 DKK</p>
              <p className="text-gray-500 text-sm">{t.services.perMonth}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <Lightbulb className="w-10 h-10 text-white mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t.services.advisory.title}</h3>
              <p className="text-primary-100 text-sm mb-4">{t.pricing.startingFrom}</p>
              <p className="text-3xl font-bold text-white">495 DKK</p>
              <p className="text-primary-200 text-sm">{t.services.perHour}</p>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              {t.pricing.viewFullPricing}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <FAQ />

      <LogoSections />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.contact.title}</h2>
              <p className="text-gray-600 mb-8">{t.contact.subtitle}</p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t.contact.info.phone}</p>
                    <p className="font-semibold text-gray-900">+45 50 29 51 59</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t.contact.info.email}</p>
                    <p className="font-semibold text-gray-900">revisor@aplusrevision.dk</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t.contact.info.hours}</p>
                    <p className="font-semibold text-gray-900">{t.contact.info.hoursValue}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3 text-primary-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">{t.hero.trustText}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8">
              <ContactForm source="homepage_contact" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
