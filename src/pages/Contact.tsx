import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-4">{t('contact.title')}</h1>
          <p className="mb-4">{t('contact.intro')}</p>

          <ul className="list-none pl-0 mt-2 text-sm text-muted-foreground space-y-3">
            <li><strong>{t('contact.email_label')}</strong> <a href="mailto:iamhuy29062006@gmail.com" className="text-primary hover:underline">iamhuy29062006@gmail.com</a></li>
            <li><strong>{t('contact.hotline_label')}</strong> {t('contact.hotline_value')}</li>
            <li><strong>{t('contact.office_label')}</strong> {t('contact.office_value')}</li>
            <li><strong>{t('contact.social_label')}</strong> GitHub: <a href="https://github.com/ThaiQuangHuy2906" className="text-primary hover:underline">ThaiQuangHuy2906</a></li>
            <li><strong>{t('contact.hours_label')}</strong> {t('contact.hours_value')}</li>
          </ul>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">{t('contact.form_intro')}</p>
            <div className="mt-3">
              <input placeholder={t('contact.form.subject_placeholder') as string} className="w-full p-3 rounded-md border border-border mb-2" />
              <textarea placeholder={t('contact.form.body_placeholder') as string} className="w-full p-3 rounded-md border border-border h-28" />
              <div className="mt-3 flex justify-end">
                <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground">{t('contact.form.submit')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
