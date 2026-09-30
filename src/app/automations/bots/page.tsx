import { redirect } from 'next/navigation';

// Assistants now live on the Automations landing page; keep old links working.
export default function BotsRedirect() {
  redirect('/automations?tab=assistants');
}
