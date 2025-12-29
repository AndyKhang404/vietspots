import { Link } from 'react-router-dom';
import { Mail, FileText, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="w-full border-t border-border bg-card py-6 px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 lg:pl-64">
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">VietSpots</h4>
          <p className="text-sm text-muted-foreground max-w-md">
            {t('footer.description') || 'Khám phá địa điểm, chia sẻ trải nghiệm và lên kế hoạch chuyến đi.'}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/privacy" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="h-4 w-4" />
            {t('help.privacy_policy') || 'Chính sách'}
          </Link>
          <Link to="/contact" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="h-4 w-4" />
            {t('help.contact_page') || 'Liên hệ'}
          </Link>
          <a href="tel:+84123456789" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="h-4 w-4" />
            +84 123 456 789
          </a>
          <Link to="/contact" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors">
            <Mail className="h-4 w-4" /> {t('footer.contact_now') || 'Liên hệ ngay'}
          </Link>
        </div>
      </div>
    </footer>
  );
}
