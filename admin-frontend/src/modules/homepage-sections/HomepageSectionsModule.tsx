import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsCard, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
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
        <OpsCard title="Homepage Sections" description="Manage section ordering, sort rules, pinned IDs, and highlight IDs.">
            <OpsToolbar
                controls={(
                    <>
                        <button type="button" className="admin-btn small subtle" onClick={() => setDraftRows((current) => [...(current.length ? current : (query.data ?? [])), blankSection()])}>
                            Add section
                        </button>
                        <button type="button" className="admin-btn small" onClick={() => setDraftRows([])}>
                            Reset changes
                        </button>
                    </>
                )}
                actions={(
                    <>
                        <span className="ops-inline-muted">Sections: {rows.length}</span>
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
            />

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
        </OpsCard>
    );
}
