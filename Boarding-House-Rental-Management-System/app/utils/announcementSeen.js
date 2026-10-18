import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (uid) => `announcements_last_seen_${uid || 'tenant'}`;
const dismissedKeyFor = (uid) => `announcements_dismissed_${uid || 'tenant'}`;

export const getAnnouncementTime = (announcement) => {
  const idTime = Number(String(announcement.announcement_id || announcement.id || '').match(/\d{10,}/)?.[0]);
  if (Number.isFinite(idTime)) return idTime;
  const parsed = Date.parse(announcement.date || announcement.created_at || '');
  return Number.isNaN(parsed) ? 0 : parsed;
};

export async function getLastSeen(uid) {
  try {
    const value = await AsyncStorage.getItem(keyFor(uid));
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}

export async function markAnnouncementsSeen(uid, announcements = []) {
  const latest = Math.max(0, ...announcements.map(getAnnouncementTime));
  if (!latest) return;
  try {
    const previous = await getLastSeen(uid);
    await AsyncStorage.setItem(keyFor(uid), String(Math.max(previous, latest)));
  } catch {
    // Ignore storage errors; the badge just shows again next time.
  }
}

export async function getDismissedAnnouncementIds(uid) {
  try {
    const value = await AsyncStorage.getItem(dismissedKeyFor(uid));
    const ids = value ? JSON.parse(value) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export async function dismissAnnouncement(uid, announcementId) {
  try {
    const ids = await getDismissedAnnouncementIds(uid);
    if (!ids.includes(announcementId)) {
      await AsyncStorage.setItem(dismissedKeyFor(uid), JSON.stringify([...ids, announcementId]));
    }
  } catch {
    // Keep the dismissal in the current screen even if local storage is unavailable.
  }
}
