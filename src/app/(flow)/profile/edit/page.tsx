import type { Metadata } from 'next';

import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/screen';
import { TopBar } from '@/components/ui';
import { laToday } from '@/lib/domain/format';
import { requestTime } from '@/lib/request-time';
import { getProfile } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Edit profile' };

export default async function EditProfilePage() {
  const { userId, email } = await requireUser();
  const p = await getProfile(userId);
  return (
    <Screen bottomBar>
      <TopBar title="Edit profile" close="/profile" />
      <ProfileForm
        today={laToday(requestTime())}
        initial={{ fullName: p?.full_name ?? '', contactEmail: p?.contact_email ?? email ?? '', phone: p?.phone ?? '', preferredMoveIn: p?.preferred_move_in ?? '', avatarPath: p?.avatar_path ?? null }}
      />
    </Screen>
  );
}
