import { Link } from 'react-router-dom';
import { Check, LucideIcon } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PricingCardProps {
  icon: LucideIcon;
  title: string;
  price: string;
  priceUnit: string;
  features: string[];
  isPopular?: boolean;
  link: string;
}

export function PricingCard({ icon: Icon, title, price, priceUnit, features, isPopular, link }: PricingCardProps) {
  const { t } = useLanguage();

  return (
    <div className={`relative bg-white rounded-2xl p-8 ${isPopular ? 'border-2 border-primary-500 shadow-xl' : 'border border-gray-200 shadow-sm'}`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-primary-600 text-white text-sm font-medium px-4 py-1.5 rounded-full">
            {t.pricing.mostPopular}
          </span>
        </div>
      )}
      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="mb-6">
        <span className="text-sm text-gray-500">{t.pricing.startingFrom}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-500">{priceUnit}</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to={link}
        className={`block text-center py-3 rounded-lg font-medium transition-colors ${
          isPopular
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        {t.services.getQuote}
      </Link>
    </div>
  );
}
