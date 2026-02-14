import type { ContentType } from '../types';

export type SourceTag =
    | 'home_featured'
    | 'home_admission_extended'
    | 'home_column_jobs'
    | 'home_column_results'
    | 'home_column_admit'
    | 'home_horizontal_answer_key'
    | 'home_horizontal_syllabus'
    | 'home_horizontal_admission'
    | 'home_horizontal_important'
    | 'home_box_jobs'
    | 'home_box_results'
    | 'home_box_admit'
    | 'home_box_answer_key'
    | 'home_box_syllabus'
    | 'home_box_admission'
    | 'home_box_important'
    | 'home_box_certificate'
    | 'category_list'
    | 'category_compact'
    | 'search_overlay'
    | 'detail_related'
    | 'bookmarks_grid'
    | 'bookmarks_compact'
    | 'profile_notifications'
    | 'profile_tracked'
    | 'header_trending';

export function buildAnnouncementDetailPath(type: ContentType, slug: string, source?: SourceTag): string {
    const base = `/${type}/${slug}`;
    if (!source) return base;
    const query = new URLSearchParams({ source });
    return `${base}?${query.toString()}`;
}
