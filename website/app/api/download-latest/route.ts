import { NextResponse } from 'next/server';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GitHubAsset[];
}

function normalizeVersion(version: string): string {
  return version
    .trim()
    .replace(/^v/i, '')
    .split(/[+-]/)[0]
    .trim();
}

function parseSemver(version: string): [number, number, number] | null {
  const normalized = normalizeVersion(version);
  const parts = normalized.split('.');
  if (parts.length < 3) return null;

  const [major, minor, patch] = parts;
  if (!/^[0-9]+$/.test(major) || !/^[0-9]+$/.test(minor) || !/^[0-9]+$/.test(patch)) {
    return null;
  }

  return [Number(major), Number(minor), Number(patch)];
}

function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) return a.localeCompare(b);

  for (let i = 0; i < 3; i += 1) {
    const diff = parsedA[i] - parsedB[i];
    if (diff !== 0) return diff;
  }

  return 0;
}

function findLatestReleaseWithMsi(releases: GitHubRelease[]): GitHubRelease | null {
  return releases
    .filter((release) => !release.draft && !release.prerelease)
    .filter((release) => release.assets?.some((asset) => asset.name.endsWith('.msi')))
    .sort((left, right) => compareSemver(right.tag_name, left.tag_name))
    .shift() ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo') || 'Horizon-Optimizer';

    const releaseUrl = `https://api.github.com/repos/HBAABA119/${repo}/releases/latest`;
    const listUrl = `https://api.github.com/repos/HBAABA119/${repo}/releases?per_page=50`;

    const githubToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'User-Agent': 'Horizon-Optimizer',
      Accept: 'application/vnd.github.v3+json',
    };
    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`;
    }

    const latestRes = await fetch(releaseUrl, { headers, cache: 'no-store' });
    if (latestRes.ok) {
      const latestRelease = (await latestRes.json()) as GitHubRelease;
      const msi = latestRelease.assets?.find((a) => a.name.endsWith('.msi'));
      if (msi) {
        return NextResponse.redirect(msi.browser_download_url, {
          status: 302,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }
    }

    const listRes = await fetch(listUrl, { headers, cache: 'no-store' });
    if (!listRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch release list' }, { status: 502 });
    }

    const releases = (await listRes.json()) as GitHubRelease[];
    const latestRelease = findLatestReleaseWithMsi(releases);

    if (!latestRelease) {
      return NextResponse.json({ error: 'No MSI installer found in any release' }, { status: 404 });
    }

    const msi = latestRelease.assets!.find((a) => a.name.endsWith('.msi'))!;
    return NextResponse.redirect(msi.browser_download_url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch latest release' }, { status: 502 });
  }
}
