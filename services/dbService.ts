import { Profile, Article } from '../types';

const STORAGE_KEYS = {
  PROFILES: 'sf_profiles_v1',
  ARTICLES: 'sf_articles_v1'
};

export const db = {
  getProfiles: (): Profile[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return data ? JSON.parse(data) : null;
  },
  saveProfiles: (profiles: Profile[]) => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  },
  getArticles: (): Article[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);
    return data ? JSON.parse(data) : null;
  },
  saveArticles: (articles: Article[]) => {
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
  },
  clearAll: () => {
    localStorage.clear();
    window.location.reload();
  }
};