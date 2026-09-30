'use client';

import { Knowledge } from '@/components/automations/Knowledge';
import { AutomationsOffAlert } from '@/components/automations/AutomationsHome';

export default function KnowledgeBasePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <AutomationsOffAlert />
      <Knowledge />
    </div>
  );
}
