import type { Locale } from '@/i18n/routing';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

type ScoreMessages = (typeof en)['scores'];

const catalogs: Record<Locale, ScoreMessages> = {
  en: en.scores,
  fr: fr.scores,
};

export function getScoreMessages(locale?: string): ScoreMessages {
  return catalogs[locale === 'fr' ? 'fr' : 'en'];
}
