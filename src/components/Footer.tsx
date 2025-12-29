import { Link } from 'react-router-dom';
import { Mail, FileText, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="w-full border-t border-border bg-card p-6 mt-8 pl-4 lg:pl-64">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 flex-wrap">
        <div className="space-y-1 min-w-0">
          <h4 className="font-semibold">VietSpots</h4>
          <p className="text-sm text-muted-foreground truncate">{t('footer.description') || 'Khám phá địa điểm, chia sẻ trải nghiệm và lên kế hoạch chuyến đi.'}</p>
        </div>

        <div className="flex items-center gap-6 flex-wrap justify-end min-w-0">
          <Link to="/privacy" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
            <FileText className="h-4 w-4" />
            {t('help.privacy_policy') || 'Chính sách'}
          </Link>
          <Link to="/contact" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
            <Mail className="h-4 w-4" />
            {t('help.contact_page') || 'Liên hệ'}
          </Link>
          <a href="tel:+84123456789" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
            <Phone className="h-4 w-4" />
            +84 123 456 789
          </a>

          {/* Prominent contact CTA kept as non-shrinking so it's visible */}
          <Link to="/contact" className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm shadow-sm hover:opacity-95 flex-shrink-0">
            <Mail className="h-4 w-4" /> {t('footer.contact_now') || 'Liên hệ ngay'}
          </Link>
        </div>
      </div>
    </footer>
  );
}
