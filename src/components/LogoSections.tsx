import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface LogoItem {
  name: string;
  url: string;
  logoUrl: string;
  alt: string;
  /** Official asset is a symbol only; show the company name beside it. */
  withName?: boolean;
}

const logos: Record<string, LogoItem> = {
  billy: {
    name: 'Billy',
    url: 'https://www.billy.dk',
    logoUrl: `${import.meta.env.BASE_URL}logos/billy.svg`,
    alt: 'Billy by Shine',
  },
  economic: {
    name: 'e-conomic',
    url: 'https://www.e-conomic.dk',
    logoUrl: `${import.meta.env.BASE_URL}logos/e-conomic.svg`,
    alt: 'e-conomic',
  },
  dinero: {
    name: 'Dinero',
    url: 'https://dinero.dk',
    logoUrl: `${import.meta.env.BASE_URL}logos/dinero.svg`,
    alt: 'Dinero',
  },
  salary: {
    name: 'Salary',
    url: 'https://www.salary.dk',
    logoUrl: `${import.meta.env.BASE_URL}logos/salary.png`,
    alt: 'Salary by Shine',
  },
  ageras: {
    name: 'Ageras',
    url: 'https://www.ageras.dk',
    logoUrl: `${import.meta.env.BASE_URL}logos/ageras.svg`,
    alt: '',
    withName: true,
  },
};

function LogoWordmark({ name }: { name: string }) {
  return (
    <span className="text-lg font-semibold tracking-tight text-gray-800">
      {name}
    </span>
  );
}

function LogoImage({ item }: { item: LogoItem }) {
  const [hasError, setHasError] = useState(false);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center justify-center gap-2"
      title={item.name}
    >
      {hasError ? (
        <LogoWordmark name={item.name} />
      ) : (
        <>
          <img
            src={item.logoUrl}
            alt={item.withName ? '' : item.alt}
            className={`${item.withName ? 'h-6' : 'h-10'} w-auto object-contain`}
            onError={() => setHasError(true)}
          />
          {item.withName && (
            <span className="text-lg font-semibold tracking-tight text-gray-900">
              {item.name}
            </span>
          )}
        </>
      )}
    </a>
  );
}

interface LogoStripProps {
  heading: string;
  subtext: string;
  items: LogoItem[];
  isDa: boolean;
  showMoreNote?: boolean;
}

function LogoStrip({ heading, subtext, items, isDa, showMoreNote }: LogoStripProps) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-2">
          {heading}
        </h2>
        <p className="text-sm text-gray-500 mb-10">
          {subtext}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {items.map((item) => (
            <LogoImage key={item.name} item={item} />
          ))}
          {showMoreNote && (
            <span className="text-sm text-gray-400 italic">
              {isDa ? '+ mange flere' : '+ many more'}
            </span>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-10">
          {isDa
            ? 'Alle varemærker og logoer tilhører de respektive ejere.'
            : 'All trademarks and logos belong to their respective owners.'}
        </p>
      </div>
    </section>
  );
}

export function LogoSections() {
  const { language } = useLanguage();
  const isDa = language === 'da';

  const systemsLogos = [logos.billy, logos.economic, logos.dinero, logos.salary];
  const partnerLogos = [logos.ageras, logos.billy, logos.salary];

  return (
    <>
      <LogoStrip
        heading={isDa ? 'Systemer vi arbejder med' : 'Systems we work with'}
        subtext={isDa ? 'Vi arbejder med disse regnskabs- og lønsystemer.' : 'We work with these accounting and payroll systems.'}
        items={systemsLogos}
        isDa={isDa}
        showMoreNote
      />

      <div className="border-t border-gray-100" />

      <LogoStrip
        heading={isDa ? 'Samarbejdspartnere' : 'Partners'}
        subtext={isDa ? 'Billy, Salary og Ageras er vores samarbejdspartnere.' : 'Billy, Salary, and Ageras are our collaboration partners.'}
        items={partnerLogos}
        isDa={isDa}
      />
    </>
  );
}
