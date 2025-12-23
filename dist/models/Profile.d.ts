import { Profile } from '../types.js';
export declare const profileModel: {
    getAll: () => Profile[];
    getById: (id: string) => Profile | null;
    create: (profile: Profile) => Profile;
    update: (id: string, profile: Partial<Profile>) => Profile | null;
    delete: (id: string) => boolean;
};
//# sourceMappingURL=Profile.d.ts.map