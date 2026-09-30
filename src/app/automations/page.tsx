import { Suspense } from 'react';
import { AutomationsHome } from '@/components/automations/AutomationsHome';

export default function AutomationsPage() {
  return (
    <Suspense fallback={null}>
      <AutomationsHome />
    </Suspense>
  );
}
