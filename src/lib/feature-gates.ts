/**
 * Kill switches for behaviour that must not run until it has been fixed and proven.
 *
 * CAMPAIGN_DISPATCH — bulk sending. HELD unless the environment says "on".
 *
 * Why: the dispatcher resolves its audience from `audienceFilter.groupId` / `tagId`
 * (singular) while the campaign wizard and the preview write `includeGroups`,
 * `includeTags`, `sendToAll` and the exclude lists. A wizard-built campaign therefore
 * resolves to NO filter and would be sent to EVERY active contact, not the audience
 * that was previewed. The dispatch API route was already returning 409 for this, but
 * the background worker's scheduler and stuck-campaign sweeper call the dispatcher
 * directly and bypassed that block — harmless only while no worker ran in production.
 * Every path into dispatchCampaign() now checks this gate.
 */
export function campaignDispatchEnabled(): boolean {
  return process.env.CAMPAIGN_DISPATCH?.trim().toLowerCase() === 'on'
}
