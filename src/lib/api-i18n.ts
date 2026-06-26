import type { Locale } from '@/i18n/routing';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

type ApiMessages = (typeof en)['api'];

const catalogs: Record<Locale, ApiMessages> = {
  en: en.api,
  fr: fr.api,
};

export function getApiMessages(locale?: string): ApiMessages {
  return catalogs[locale === 'fr' ? 'fr' : 'en'];
}
