import { Link } from 'react-router-dom';
import { Eye, Shield, Users, Laptop, ArrowRight, Check, Building2, Handshake } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function AboutPage() {
  const { t } = useLanguage();

  const values = [
    {
      icon: Eye,
      title: t.about.values.clarity.title,
      description: t.about.values.clarity.description,
    },
    {
      icon: Shield,
      title: t.about.values.reliability.title,
      description: t.about.values.reliability.description,
    },
    {
      icon: Users,
      title: t.about.values.accessibility.title,
      description: t.about.values.accessibility.description,
    },
    {
      icon: Laptop,
      title: t.about.values.digital.title,
      description: t.about.values.digital.description,
    },
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-gray-50 via-white to-primary-50/30 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">{t.about.title}</h1>
            <p className="text-xl text-gray-600 leading-relaxed">{t.about.intro}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Building2 className="w-4 h-4" />
                {t.about.mission.title}
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">
                {t.about.mission.description}
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Handshake className="w-4 h-4" />
                {t.about.howWeWork.title}
              </div>
              <p className="text-primary-100 mb-6">{t.about.howWeWork.description}</p>
              <ul className="space-y-3">
                {t.about.howWeWork.points.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{t.about.values.title}</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            {t.about.mission.description.split('.')[0]}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.about.expectations.title}</h2>
            <p className="text-gray-600 text-lg">{t.about.expectations.description}</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-8">
              <ul className="space-y-4">
                {t.about.expectations.points.map((point, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
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
