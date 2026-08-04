/**
 * Shared admin authentication utility.
 * Verifies that the requester is the site admin.
 */

import { getAccessToken, getConfig } from './firebase-admin';

/**
 * Verify that a Firebase ID token belongs to the admin email.
 */
export async function isAdmin(idToken: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const projectId = getConfig().projectId;

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return false;
    const data = (await res.json()) as { users?: Array<{ email: string }> };
    const email = data.users?.[0]?.email?.toLowerCase();
    return email === 'aayan.b.asim@gmail.com';
  } catch {
    return false;
  }
}
