import { Link } from 'react-router-dom';
import { Mail, FileText, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card p-6 mt-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-semibold">VietSpots</h4>
          <p className="text-sm text-muted-foreground">Khám phá địa điểm, chia sẻ trải nghiệm và lên kế hoạch chuyến đi.</p>
        </div>

        <div className="flex gap-6">
          <Link to="/privacy" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <FileText className="h-4 w-4" />
            Chính sách bảo mật
          </Link>
          <Link to="/contact" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Mail className="h-4 w-4" />
            Liên hệ
          </Link>
        </div>
      </div>
    </footer>
  );
}
