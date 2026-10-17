import { AuthScreen } from '@/components/auth/auth-screen';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'Welcome back · Hope',
  description: 'Log into your personal Hope space to pick up right where you left off.',
});

export default function LoginPage() {
  return <AuthScreen signup={false} />;
}
