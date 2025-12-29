import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <Layout>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">{t('privacy.title')}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t('privacy.last_updated')}</p>

          <p className="mb-4">{t('privacy.intro')}</p>

        <h2 className="font-semibold mt-4">{t('privacy.section1.title')}</h2>
        <ul className="list-disc pl-6 mt-2 mb-4 text-sm text-muted-foreground">
          <li><strong>{t('privacy.section1.item1.title')}</strong> {t('privacy.section1.item1.body')}</li>
          <li><strong>{t('privacy.section1.item2.title')}</strong> {t('privacy.section1.item2.body')}</li>
          <li><strong>{t('privacy.section1.item3.title')}</strong> {t('privacy.section1.item3.body')}</li>
        </ul>

        <h2 className="font-semibold mt-4">{t('privacy.section2.title')}</h2>
        <ul className="list-disc pl-6 mt-2 mb-4 text-sm text-muted-foreground">
          <li>{t('privacy.section2.item1')}</li>
          <li>{t('privacy.section2.item2')}</li>
          <li>{t('privacy.section2.item3')}</li>
          <li>{t('privacy.section2.item4')}</li>
        </ul>

        <h2 className="font-semibold mt-4">{t('privacy.section3.title')}</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">{t('privacy.section3.body')}</p>

        <h2 className="font-semibold mt-4">{t('privacy.section4.title')}</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">{t('privacy.section4.body')}</p>

        <h2 className="font-semibold mt-4">{t('privacy.section5.title')}</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">{t('privacy.section5.body')}</p>

          <p className="text-sm text-muted-foreground mt-6">{t('privacy.contact_line_start')} <Link to="/contact" className="text-primary hover:underline">{t('contact.title')}</Link> {t('privacy.contact_line_end')}</p>
        </div>

      </div>
    </Layout>
  );
}
