import { Phone, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ContactForm } from '../components/ContactForm';

export function ContactPage() {
  const { t, language } = useLanguage();

  return (
    <>
      <section className="bg-gradient-to-br from-gray-50 via-white to-primary-50/30 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.contact.title}</h1>
            <p className="text-xl text-gray-600">{t.contact.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                {language === 'da' ? 'Kontaktoplysninger' : 'Contact information'}
              </h2>
              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{t.contact.info.phone}</p>
                    <p className="text-lg font-semibold text-gray-900">+45 50 29 51 59</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{t.contact.info.email}</p>
                    <p className="text-lg font-semibold text-gray-900">Info.aplusrevision@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{t.contact.info.hours}</p>
                    <p className="text-lg font-semibold text-gray-900">{t.contact.info.hoursValue}</p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-primary-600" />
                  <span className="font-semibold text-primary-900">
                    {language === 'da' ? 'Det kan du forvente' : 'What you can expect'}
                  </span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-primary-800">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                    {language === 'da' ? 'Svar inden 24 timer' : 'Response within 24 hours'}
                  </li>
                  <li className="flex items-center gap-2 text-primary-800">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                    {language === 'da' ? 'Gratis og uforpligtende intromøde' : 'Free and non-binding intro meeting'}
                  </li>
                  <li className="flex items-center gap-2 text-primary-800">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                    {language === 'da' ? 'Klart tilbud uden skjulte omkostninger' : 'Clear offer with no hidden costs'}
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <div className="bg-gray-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {language === 'da' ? 'Send os en besked' : 'Send us a message'}
                </h2>
                <p className="text-gray-600 mb-8">
                  {language === 'da'
                    ? 'Udfyld formularen, og vi kontakter dig hurtigst muligt.'
                    : 'Fill out the form and we will contact you as soon as possible.'}
                </p>
                <ContactForm source="contact_page" />
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
