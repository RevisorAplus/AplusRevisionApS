import { Link } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  price?: string;
  priceUnit?: string;
  link: string;
}

export function ServiceCard({ icon: Icon, title, description, price, priceUnit, link }: ServiceCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-100 transition-all duration-300 group">
      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
        <Icon className="w-6 h-6 text-primary-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">{description}</p>
      {price && (
        <p className="text-primary-600 font-semibold mb-4">
          {t.services.from} {price} {priceUnit}
        </p>
      )}
      <Link
        to={link}
        className="inline-flex items-center gap-2 text-primary-600 font-medium text-sm group-hover:gap-3 transition-all"
      >
        {t.services.learnMore}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
