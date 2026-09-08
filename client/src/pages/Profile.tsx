import { useState } from 'react';
import apiClient from '../api/client';
import ActionButton from '../components/ActionButton';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import Field, { inputClass, selectClass } from '../components/Field';
import MicLevelMeter from '../components/MicLevelMeter';
import { RANKS, REGIONS } from '../constants';
import { useCurrentUser, type CurrentUser } from '../hooks/useCurrentUser';

type ProfileForm = {
    firstName: string;
    lastName: string;
    rank: string;
    region: string;
};

// Empty text fields are '', unset selects are the literal 'Not set' option value.
const EMPTY_FORM: ProfileForm = { firstName: '', lastName: '', rank: 'Not set', region: 'Not set' };

const disabledInputClass = `${inputClass} opacity-60 cursor-not-allowed`;

export default function Profile() {
    const { user, loading } = useCurrentUser();
    const [username, setUsername] = useState('');
    const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
    const [saved, setSaved] = useState<ProfileForm>(EMPTY_FORM);
    const [seededFrom, setSeededFrom] = useState<CurrentUser | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Seed the working copy and the last-saved snapshot from the fetched profile.
    // `useCurrentUser` sets `user` once, so this runs a single time per load; done
    // in render (not an effect) to avoid a cascading re-render.
    if (user && user !== seededFrom) {
        const seeded: ProfileForm = {
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            rank: user.rank || 'Not set',
            region: user.region || 'Not set',
        };
        setSeededFrom(user);
        setUsername(user.username ?? '');
        setForm(seeded);
        setSaved(seeded);
    }

    const dirty = JSON.stringify(form) !== JSON.stringify(saved);

    const editField = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
        setJustSaved(false);
        setSaveError('');
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError('');
        try {
            await apiClient.put('/api/users/me', {
                firstName: form.firstName || null,
                lastName: form.lastName || null,
                rank: form.rank === 'Not set' ? null : form.rank,
                region: form.region === 'Not set' ? null : form.region,
            });
            setSaved(form);
            setJustSaved(true);
        } catch {
            setSaveError('Could not save changes. Try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        setForm(saved);
        setJustSaved(false);
    };

    const statusLine = dirty ? 'Unsaved changes' : justSaved ? 'Saved just now' : 'Up to date';

    const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || `@${username}`;
    const meta =
        [form.rank, form.region].filter((v) => v && v !== 'Not set').join(' · ') || 'NO RANK OR REGION SET';

    const rightRail = (
        <div className="flex flex-col gap-5">
            <Card label="How you appear in queue" padding={20}>
                <div className="border border-line-4 rounded-tile p-[18px] bg-subtle flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-line-3 border-2 border-accent" />
                    <div className="flex flex-col items-center gap-1 text-center">
                        <span className="text-[14px] font-semibold text-ink">{displayName}</span>
                        <span className="font-mono text-[10px] tracking-[.1em] text-ink-3">{meta}</span>
                    </div>
                </div>
                <p className="text-[12px] text-ink-3 leading-[1.45]">
                    {'Rank and region drive who you get matched with. "Not set" widens the pool.'}
                </p>
            </Card>

            <Card padding={20}>
                <MicLevelMeter />
            </Card>
        </div>
    );

    if (loading) {
        return (
            <AppShell rightRail={rightRail}>
                <p className="text-[14px] text-ink-3">Loading…</p>
            </AppShell>
        );
    }

    return (
        <AppShell rightRail={rightRail}>
            <div className="flex flex-col gap-[30px]">
                {/* Identity header */}
                <div className="flex items-start gap-[18px]">
                    <div className="w-[72px] h-[72px] rounded-full bg-line-3 border border-line flex-none" />
                    <div className="flex flex-col gap-[6px] pt-[6px]">
                        <h2 className="text-[30px] font-bold tracking-[-.02em] text-ink">Profile &amp; settings</h2>
                        <div className="flex items-center gap-[10px]">
                            <span className="font-mono text-[13px] text-ink-2">@{username}</span>
                            <span className="font-mono text-[9px] tracking-[.12em] border border-line-2 rounded-tag px-[6px] py-[2px] text-ink-4">
                                SET AT REGISTRATION
                            </span>
                        </div>
                    </div>
                </div>

                {/* Account */}
                <Card label="Account" padding={24}>
                    <div className="flex flex-col gap-[22px]">
                        <div className="grid grid-cols-2 gap-5">
                            <Field label="First name" hint="Optional" htmlFor="firstName">
                                <input
                                    id="firstName"
                                    className={inputClass}
                                    placeholder="Not set"
                                    value={form.firstName}
                                    onChange={editField('firstName')}
                                />
                            </Field>
                            <Field label="Last name" hint="Optional" htmlFor="lastName">
                                <input
                                    id="lastName"
                                    className={inputClass}
                                    placeholder="Not set"
                                    value={form.lastName}
                                    onChange={editField('lastName')}
                                />
                            </Field>
                        </div>

                        <div>
                            <Field label="Username">
                                <div className="h-10 border border-line-4 rounded-control px-3 flex items-center justify-between bg-inset">
                                    <span className="font-mono text-[14px] text-ink-3">{username}</span>
                                    <span className="text-[11px] text-ink-4">Read only</span>
                                </div>
                            </Field>
                            <p className="text-[12px] text-ink-3 mt-[7px]">
                                Chosen at registration and can&apos;t be changed.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <Field label="Rank" htmlFor="rank">
                                <select
                                    id="rank"
                                    className={selectClass}
                                    value={form.rank}
                                    onChange={editField('rank')}
                                >
                                    <option>Not set</option>
                                    {RANKS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Region" htmlFor="region">
                                <select
                                    id="region"
                                    className={selectClass}
                                    value={form.region}
                                    onChange={editField('region')}
                                >
                                    <option>Not set</option>
                                    {REGIONS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <Field label="Email">
                            <div className="h-10 border border-dashed border-line-2 rounded-control px-3 flex items-center justify-between bg-subtle">
                                <span className="font-mono text-[13px] text-ink-3">Not shown</span>
                                <span className="text-[11px] text-ink-4">Not returned by the profile endpoint</span>
                            </div>
                        </Field>

                        <div className="flex items-center gap-4 border-t border-line-3 pt-5">
                            <ActionButton
                                onClick={handleSave}
                                variant={dirty ? 'accent' : 'accent-clean'}
                                stretch={false}
                                disabled={isSaving}
                                className="h-[42px] px-[22px] text-[15px] font-semibold"
                            >
                                {isSaving ? 'Saving…' : 'Save changes'}
                            </ActionButton>
                            <ActionButton
                                onClick={handleDiscard}
                                variant="neutral"
                                stretch={false}
                                disabled={!dirty}
                                className="h-[42px] px-[18px] text-[14px]"
                            >
                                Discard changes
                            </ActionButton>
                            <div className="flex-1" />
                            <div className="flex flex-col items-end gap-1">
                                {saveError && <span className="text-[12px] text-[#b3261e]">{saveError}</span>}
                                <span className="font-mono text-[11px] text-ink-3">{statusLine}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Password — laid out per the design but entirely inert for now. */}
                <Card label="Password" padding={24}>
                    <div className="flex flex-col gap-4 max-w-[420px]">
                        <Field label="Current password" htmlFor="currentPassword">
                            <input
                                id="currentPassword"
                                type="password"
                                disabled
                                placeholder="••••••••"
                                className={disabledInputClass}
                            />
                        </Field>
                        <Field label="New password" htmlFor="newPassword">
                            <input
                                id="newPassword"
                                type="password"
                                disabled
                                placeholder="••••••••"
                                className={disabledInputClass}
                            />
                        </Field>
                        <Field label="Confirm new password" htmlFor="confirmPassword">
                            <input
                                id="confirmPassword"
                                type="password"
                                disabled
                                placeholder="••••••••"
                                className={disabledInputClass}
                            />
                        </Field>
                        <ActionButton
                            onClick={() => {}}
                            variant="outline"
                            stretch={false}
                            disabled
                            className="h-10 px-5 text-[14px] font-semibold self-start opacity-60 cursor-not-allowed"
                        >
                            Update password
                        </ActionButton>
                        <p className="text-[12px] text-ink-3">Password changes aren&apos;t available yet.</p>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
