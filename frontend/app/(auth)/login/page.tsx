import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthScreen } from '@/components/auth/auth-screen';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'Welcome back · Hope',
  description: 'Log into your personal Hope space to pick up right where you left off.',
});

export default async function LoginPage() {
  const session = await auth();
  const cookieStore = await cookies();
  const patientId = cookieStore.get('cbt_patient_id')?.value;

  if (session?.user || (patientId && patientId.trim() !== '')) {
    redirect('/dashboard');
  }

  return <AuthScreen signup={false} />;
}

