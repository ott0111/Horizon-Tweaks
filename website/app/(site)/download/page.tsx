import type { Metadata } from 'next';
import DownloadPage from '@/components/DownloadPage';

export const metadata: Metadata = {
  title: 'Download — Horizon Tweaks',
  description: 'Download Horizon Tweaks for Windows 10/11. Desktop app for optimizations, or book expert tuning services through Discord.',
};

export default function DownloadRoute() {
  return <DownloadPage />;
}
