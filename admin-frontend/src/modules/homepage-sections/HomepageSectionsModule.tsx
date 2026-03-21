import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ModuleScaffold } from '../../components/workspace';
import { OpsErrorState, OpsTable } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { getHomepageSections, updateHomepageSections } from '../../lib/api/client';
import type { HomepageSectionConfig } from '../../types';

const blankSection = (): HomepageSectionConfig => ({
    key: '',
    title: '',
    itemType: 'important',
    sortRule: 'newest',
    pinnedIds: [],
    highlightIds: [],
});

export function HomepageSectionsModule() {
    const queryClient = useQueryClient();
    const { notifySuccess, notifyError } = useAdminNotifications();
    const [draftRows, setDraftRows] = useState<HomepageSectionConfig[]>([]);

    const query = useQuery({
        queryKey: ['admin-homepage-sections'],
        queryFn: () => getHomepageSections(),
    });

    const rows = useMemo(() => (draftRows.length > 0 ? draftRows : (query.data ?? [])), [draftRows, query.data]);
    const pinnedCount = useMemo(() => rows.reduce((sum, row) => sum + row.pinnedIds.length, 0), [rows]);
    const highlightCount = useMemo(() => rows.reduce((sum, row) => sum + row.highlightIds.length, 0), [rows]);

    const saveMutation = useMutation({
        mutationFn: async () => updateHomepageSections(rows.map((row) => ({
            ...row,
            pinnedIds: row.pinnedIds,
            highlightIds: row.highlightIds,
        }))),
        onSuccess: async () => {
            notifySuccess('Homepage sections updated', 'Sorting and highlights are saved.');
            setDraftRows([]);
            await queryClient.invalidateQueries({ queryKey: ['admin-homepage-sections'] });
        },
        onError: (error) => {
            notifyError('Save failed', error instanceof Error ? error.message : 'Unable to save section config.');
        },
    });

    const setField = <K extends keyof HomepageSectionConfig>(index: number, key: K, value: HomepageSectionConfig[K]) => {
        setDraftRows((current) => {
            const base = current.length > 0 ? [...current] : [...(query.data ?? [])];
            if (!base[index]) return base;
            base[index] = { ...base[index], [key]: value };
            return base;
        });
    };

    return (
        <ModuleScaffold
            eyebrow="Publishing"
            title="Homepage Sections"
            description="Manage section ordering, sort rules, pinned IDs, and highlight IDs."
            metrics={[
                { key: 'homepage-sections', label: 'Sections', value: rows.length },
                { key: 'homepage-pins', label: 'Pinned IDs', value: pinnedCount, tone: pinnedCount > 0 ? 'info' : 'neutral' },
                { key: 'homepage-highlights', label: 'Highlights', value: highlightCount, tone: highlightCount > 0 ? 'warning' : 'neutral' },
            ]}
            headerActions={(
                <>
                    <button type="button" className="admin-btn subtle" onClick={() => setDraftRows((current) => [...(current.length ? current : (query.data ?? [])), blankSection()])}>
                        Add section
                    </button>
                    <button type="button" className="admin-btn subtle" onClick={() => setDraftRows([])}>
                        Reset changes
                    </button>
                    <button
                        type="button"
                        className="admin-btn primary"
                        disabled={rows.length === 0 || saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save Sections'}
                    </button>
                </>
            )}
        >
            <div className="ops-stack">
                {query.isPending ? <div className="admin-alert info">Loading section config...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load homepage sections." /> : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'key', label: 'Key' },
                            { key: 'title', label: 'Title' },
                            { key: 'type', label: 'Type' },
                            { key: 'sort', label: 'Sort' },
                            { key: 'pins', label: 'Pinned IDs' },
                            { key: 'highlight', label: 'Highlight IDs' },
                        ]}
                    >
                        {rows.map((row, index) => (
                            <tr key={`${row.key || 'section'}-${index}`}>
                                <td>
                                    <input
                                        value={row.key}
                                        onChange={(event) => setField(index, 'key', event.target.value)}
                                        placeholder="latest-jobs"
                                    />
                                </td>
                                <td>
                                    <input
                                        value={row.title}
                                        onChange={(event) => setField(index, 'title', event.target.value)}
                                        placeholder="Latest Jobs"
                                    />
                                </td>
                                <td>
                                    <select
                                        value={row.itemType}
                                        onChange={(event) => setField(index, 'itemType', event.target.value as HomepageSectionConfig['itemType'])}
                                    >
                                        <option value="job">Job</option>
                                        <option value="result">Result</option>
                                        <option value="admit-card">Admit Card</option>
                                        <option value="answer-key">Answer Key</option>
                                        <option value="syllabus">Syllabus</option>
                                        <option value="admission">Admission</option>
                                        <option value="important">Important</option>
                                    </select>
                                </td>
                                <td>
                                    <select
                                        value={row.sortRule}
                                        onChange={(event) => setField(index, 'sortRule', event.target.value as HomepageSectionConfig['sortRule'])}
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="sticky">Sticky first</option>
                                        <option value="trending">Trending</option>
                                    </select>
                                </td>
                                <td>
                                    <input
                                        value={row.pinnedIds.join(', ')}
                                        onChange={(event) => setField(index, 'pinnedIds', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                                        placeholder="id1, id2"
                                    />
                                </td>
                                <td>
                                    <input
                                        value={row.highlightIds.join(', ')}
                                        onChange={(event) => setField(index, 'highlightIds', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                                        placeholder="idA, idB"
                                    />
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}
            </div>
        </ModuleScaffold>
    );
}
