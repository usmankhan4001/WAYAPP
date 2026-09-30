import { redirect } from 'next/navigation';

// The flow list is the Flows tab of the Automations landing page.
export default function FlowsRedirect() {
  redirect('/automations?tab=flows');
}
