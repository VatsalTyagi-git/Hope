import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthScreen } from '@/components/auth/auth-screen';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'A space of your own · Hope',
  description: 'Create your account to start your personal, safe wellbeing journey with Hope.',
});

export default async function SignupPage() {
  const session = await auth();
  const cookieStore = await cookies();
  const patientId = cookieStore.get('cbt_patient_id')?.value;

  if (session?.user || (patientId && patientId.trim() !== '')) {
    redirect('/dashboard');
  }

  return <AuthScreen signup={true} />;
}

