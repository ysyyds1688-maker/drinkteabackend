import { Article } from '../types.js';
export declare const articleModel: {
    getAll: () => Article[];
    getById: (id: string) => Article | null;
    create: (article: Article) => Article;
    update: (id: string, article: Partial<Article>) => Article | null;
    incrementViews: (id: string) => void;
    delete: (id: string) => boolean;
};
//# sourceMappingURL=Article.d.ts.map