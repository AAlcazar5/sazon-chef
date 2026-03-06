// frontend/app/paywall.tsx
// Paywall / subscription upgrade screen (Expo Router)

import { useRouter } from 'expo-router';
import { PaywallScreen } from '../components/premium/PaywallScreen';

export default function PaywallRoute() {
  const router = useRouter();
  return <PaywallScreen onClose={() => router.back()} />;
}
