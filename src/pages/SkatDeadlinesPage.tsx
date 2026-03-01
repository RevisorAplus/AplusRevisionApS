import { Calendar, AlertCircle, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Link } from 'react-router-dom';

interface DeadlineRow {
  period: string;
  date: string;
}

interface DeadlineGroup {
  heading: string;
  note?: string;
  rows: DeadlineRow[];
}

interface Section {
  title: string;
  subtitle?: string;
  groups: DeadlineGroup[];
  footerNote?: string;
}

const daSections: Section[] = [
  {
    title: 'Moms (VAT) frister',
    subtitle: 'Gælder for både indberetning og betaling',
    groups: [
      {
        heading: 'Halvårlig moms',
        rows: [
          { period: '1. halvår', date: '1. september' },
          { period: '2. halvår', date: '1. marts' },
        ],
      },
      {
        heading: 'Kvartalsvis moms',
        rows: [
          { period: '1. kvartal (jan–mar)', date: '1. juni' },
          { period: '2. kvartal (apr–jun)', date: '1. september' },
          { period: '3. kvartal (jul–sep)', date: '1. december' },
          { period: '4. kvartal (okt–dec)', date: '1. marts' },
        ],
      },
    ],
    footerNote: 'Vigtigt: Falder en frist på en weekend eller helligdag, flyttes den til næste hverdag.',
  },
  {
    title: 'Årsrapport (Årsregnskab)',
    subtitle: 'Frist for indsendelse til Erhvervsstyrelsen',
    groups: [
      {
        heading: 'Regnskabsår slutter 31/12 (mest almindeligt)',
        rows: [
          { period: 'Indsendelsesfrist', date: '30. juni' },
        ],
      },
      {
        heading: 'Skævt regnskabsår?',
        note: 'Hvis dit regnskabsår slutter på en anden dato, tælles fristen fra din årsafslutning:',
        rows: [
          { period: 'Virksomheder med andre perioder end kalenderåret', date: 'Inden for 6 måneder efter regnskabsårets udløb' },
        ],
      },
    ],
  },
];

const enSections: Section[] = [
  {
    title: 'VAT (Moms) deadlines',
    subtitle: 'Applies to both filing and payment',
    groups: [
      {
        heading: 'Half-year VAT',
        rows: [
          { period: '1st half-year', date: '1 September' },
          { period: '2nd half-year', date: '1 March' },
        ],
      },
      {
        heading: 'Quarterly VAT',
        rows: [
          { period: 'Q1 (Jan–Mar)', date: '1 June' },
          { period: 'Q2 (Apr–Jun)', date: '1 September' },
          { period: 'Q3 (Jul–Sep)', date: '1 December' },
          { period: 'Q4 (Oct–Dec)', date: '1 March' },
        ],
      },
    ],
    footerNote: 'Important: If a deadline falls on a weekend or public holiday, it moves to the next weekday.',
  },
  {
    title: 'Annual accounts (Årsrapport)',
    subtitle: 'Deadline for submission to the Danish Business Authority',
    groups: [
      {
        heading: 'Most common year-end: 31/12',
        rows: [
          { period: 'Submission deadline', date: '30 June' },
        ],
      },
      {
        heading: 'Skewed financial year?',
        note: 'If your financial year ends on a different date, the deadline is counted from your year-end:',
        rows: [
          { period: 'Companies with periods other than the calendar year', date: 'Within 6 months after the financial year ends' },
        ],
      },
    ],
  },
];

export function SkatDeadlinesPage() {
  const { language, t } = useLanguage();
  const sections = language === 'da' ? daSections : enSections;
  const deadlines = t.skatDeadlines;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-600 rounded-2xl p-4">
              <Calendar className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            {deadlines.title}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {deadlines.intro}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {sections.map((section, si) => (
          <div key={si} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-900 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">{section.title}</h2>
              {section.subtitle && (
                <p className="text-gray-400 mt-1 text-sm">{section.subtitle}</p>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {section.groups.map((group, gi) => (
                <div key={gi} className="px-8 py-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-primary-600" />
                    {group.heading}
                  </h3>

                  {group.note && (
                    <p className="text-sm text-gray-500 mb-4 ml-6">{group.note}</p>
                  )}

                  {group.rows.length > 0 && (
                    <div className="ml-6 rounded-xl overflow-hidden border border-gray-200">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                          {group.rows.map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="px-5 py-3.5 text-gray-600 font-medium w-1/2">{row.period}</td>
                              <td className="px-5 py-3.5 text-gray-900 font-semibold">{row.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {section.footerNote && (
              <div className="border-t border-gray-200 bg-amber-50 px-8 py-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{section.footerNote}</p>
              </div>
            )}
          </div>
        ))}

        <div className="bg-primary-600 rounded-2xl p-8 sm:p-10 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">
            {language === 'da' ? 'Vi håndterer alle dine SKAT-indberetninger' : 'We handle all your SKAT filings'}
          </h2>
          <p className="text-primary-100 mb-6 max-w-xl mx-auto">
            {deadlines.note}
          </p>
          <Link
            to="/contact"
            className="inline-block bg-white text-primary-700 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors"
          >
            {language === 'da' ? 'Få hjælp til dine SKAT-indberetninger' : 'Get help with your SKAT filings'}
          </Link>
        </div>
      </div>
    </div>
  );
}
