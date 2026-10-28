import { useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';

const ADS_CONVERSION_SEND_TO = 'AW-18068750519/69UCISJhJgcELeB7adD';
const INBOX = 'revisor@aplusrevision.dk';

type Gtag = (...args: unknown[]) => void;

function reportLeadConversion() {
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  if (typeof gtag !== 'function') return;
  try {
    gtag('event', 'conversion', { send_to: ADS_CONVERSION_SEND_TO });
  } catch {
    // A blocked ads script must not hide a lead that was already delivered.
  }
}

interface ContactFormProps {
  source?: string;
}

interface LeadFields {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

export function ContactForm({ source = 'contact_form' }: ContactFormProps) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const conversionReported = useRef(false);

  const reportOnce = () => {
    if (conversionReported.current) return;
    conversionReported.current = true;
    reportLeadConversion();
  };

  const mailtoHref = (lead: LeadFields) => {
    const subject = language === 'da' ? 'Ny henvendelse fra hjemmesiden' : 'New inquiry from the website';
    const lines = [
      `${language === 'da' ? 'Navn' : 'Name'}: ${lead.name}`,
      `Email: ${lead.email}`,
      `${language === 'da' ? 'Telefon' : 'Phone'}: ${lead.phone || '-'}`,
      `${language === 'da' ? 'Virksomhed' : 'Company'}: ${lead.company || '-'}`,
      `${language === 'da' ? 'Besked' : 'Message'}: ${lead.message || '-'}`,
      `${language === 'da' ? 'Kilde' : 'Source'}: ${source}`,
      `${language === 'da' ? 'Sprog' : 'Language'}: ${language}`,
    ];
    return `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    conversionReported.current = false;

    try {
      const { error } = await supabase.from('contact_leads').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        message: formData.message,
        source,
        language,
      });

      if (error) {
        setStatus('error');
        return;
      }

      reportOnce();
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', company: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-6 h-6 text-primary-600" />
        </div>
        <p className="text-primary-800 font-medium">{t.contact.form.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.contact.form.name} *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.contact.form.email} *
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.contact.form.phone}
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.contact.form.company}
          </label>
          <input
            type="text"
            id="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t.contact.form.message}
        </label>
        <textarea
          id="message"
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
        />
      </div>
      {status === 'error' && (
        <div className="space-y-2">
          <p className="text-red-600 text-sm">{t.contact.form.error}</p>
          <p className="text-sm text-gray-600">{t.contact.form.emailFallbackHint}</p>
          <a
            href={mailtoHref(formData)}
            onClick={reportOnce}
            className="inline-flex text-sm font-medium text-primary-700 underline underline-offset-2"
          >
            {t.contact.form.emailFallback}
          </a>
        </div>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-primary-600 text-white py-3.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t.contact.form.sending}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            {t.contact.form.submit}
          </>
        )}
      </button>
    </form>
  );
}
