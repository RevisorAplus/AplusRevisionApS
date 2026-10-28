import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface LogoItem {
  name: string;
  url: string;
  logoUrl: string | null;
  alt: string;
}

const asset = (file: string) => `${import.meta.env.BASE_URL}logos/${file}`;

const logos: Record<string, LogoItem> = {
  billy: {
    name: 'Billy',
    url: 'https://www.billy.dk',
    logoUrl: asset('billy.svg'),
    alt: 'Billy regnskabsprogram',
  },
  economic: {
    name: 'e-conomic',
    url: 'https://www.e-conomic.dk',
    logoUrl: `${import.meta.env.BASE_URL}e-conomic-logo.png`,
    alt: 'e-conomic regnskabsprogram',
  },
  dinero: {
    name: 'Dinero',
    url: 'https://dinero.dk',
    logoUrl: asset('dinero.svg'),
    alt: 'Dinero regnskabsprogram',
  },
  salary: {
    name: 'Salary',
    url: 'https://www.salary.dk',
    logoUrl: asset('salary.png'),
    alt: 'Salary lønsystem',
  },
  ageras: {
    name: 'Ageras',
    url: 'https://www.ageras.dk',
    logoUrl: `${import.meta.env.BASE_URL}ageras_logo.png`,
    alt: 'Ageras',
  },
};

function LogoPlaceholder({ name }: { name: string }) {
  return (
    <span className="text-sm font-semibold tracking-wide text-gray-500">{name}</span>
  );
}

function LogoImage({ item }: { item: LogoItem }) {
  const [hasError, setHasError] = useState(false);

  if (!item.logoUrl || hasError) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex"
        title={item.name}
      >
        <LogoPlaceholder name={item.name} />
      </a>
    );
  }

  const isAgeras = item.name === 'Ageras';
  const baseClasses = isAgeras
    ? 'h-7 w-auto object-contain transition-all duration-300'
    : 'h-11 w-auto max-w-[9rem] object-contain transition-all duration-300';
  const filterClasses = 'opacity-70 grayscale hover:opacity-100 hover:grayscale-0';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center"
      title={item.name}
    >
      <div className="flex flex-col items-center">
        <img
          src={item.logoUrl}
          alt={item.alt}
          className={`${baseClasses} ${filterClasses}`}
          onError={() => setHasError(true)}
        />
        {isAgeras && (
          <span className="text-[11px] font-medium text-gray-400 mt-1 tracking-wide">Ageras</span>
        )}
      </div>
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

        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
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
