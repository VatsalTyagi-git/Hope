import { AuthScreen } from '@/components/auth/auth-screen';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'A space of your own · Hope',
  description: 'Create your account to start your personal, safe wellbeing journey with Hope.',
});

export default function SignupPage() {
  return <AuthScreen signup={true} />;
}
