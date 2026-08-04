import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import SettingsPanel from '@/components/SettingsPanel';

export const metadata: Metadata = {
  title: 'Account Settings — Horizon Tweaks',
  description: 'Manage your Horizon Tweaks account, display name, and subscription tier.',
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Update your display name and view your current Horizon Tweaks tier."
        compact
      />
      <section className="pb-24 px-4">
        <SettingsPanel />
      </section>
    </>
  );
}
