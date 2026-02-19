import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsCard, OpsErrorState } from '../../components/ops';
import { getAdminSetting, updateAdminSetting } from '../../lib/api/client';

const parseLines = (value: string) => value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

type SettingsKey = 'states' | 'boards' | 'tags';

function SettingEditor({
    settingKey,
    title,
    description,
}: {
    settingKey: SettingsKey;
    title: string;
    description: string;
}) {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState('');

    const query = useQuery({
        queryKey: ['admin-setting', settingKey],
        queryFn: () => getAdminSetting(settingKey),
    });

    const values = query.data?.values ?? [];

    const saveMutation = useMutation({
        mutationFn: async () => updateAdminSetting(settingKey, parseLines(draft || values.join('\n'))),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-setting', settingKey] });
            setDraft('');
        },
    });

    return (
        <OpsCard title={title} description={description}>
            {query.isPending ? <div className="admin-alert info">Loading {title.toLowerCase()}...</div> : null}
            {query.error ? <OpsErrorState message={`Failed to load ${title.toLowerCase()}.`} /> : null}
            {!query.isPending ? (
                <div className="ops-form-grid">
                    <textarea
                        className="ops-span-full ops-textarea"
                        value={draft || values.join('\n')}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={`Enter ${title.toLowerCase()} (one per line)`}
                    />
                    <div className="ops-actions ops-span-full">
                        <button type="button" className="admin-btn primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                            {saveMutation.isPending ? 'Saving...' : `Save ${title}`}
                        </button>
                        <button type="button" className="admin-btn subtle" onClick={() => setDraft('')}>
                            Reset
                        </button>
                    </div>
                </div>
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">{title} updated.</div> : null}
            {saveMutation.isError ? <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : `Failed to save ${title.toLowerCase()}.`} /> : null}
        </OpsCard>
    );
}

export function SettingsModule() {
    return (
        <>
            <SettingEditor
                settingKey="states"
                title="States List"
                description="Maintain state taxonomy for filtering and tagging."
            />
            <SettingEditor
                settingKey="boards"
                title="Exam Boards"
                description="Maintain SSC/UPSC/Railway and other board taxonomy."
            />
            <SettingEditor
                settingKey="tags"
                title="Global Tags"
                description="Shared tags used for Jobs/Results/Admit Card and SEO."
            />
        </>
    );
}
