import { describe, it, expect, beforeEach } from 'vitest';
import { isModuleEnabled, setModuleEnabled, getAllAppModules, REGISTERED_MODULES, invalidateModuleCache } from '@/lib/modules';

describe('App Modules Switchboard', () => {
  beforeEach(() => {
    invalidateModuleCache();
  });

  it('should list all registered default modules', async () => {
    const modules = await getAllAppModules();
    expect(modules.length).toBeGreaterThanOrEqual(REGISTERED_MODULES.length);
    const copilot = modules.find((m) => m.id === 'ai_copilot');
    expect(copilot).toBeDefined();
    expect(copilot?.category).toBe('SALES_AI');
  });

  it('should toggle a module state and reflect in isModuleEnabled', async () => {
    // Toggle ecommerce ON
    await setModuleEnabled('ecommerce', true);
    const enabled = await isModuleEnabled('ecommerce');
    expect(enabled).toBe(true);

    // Toggle ecommerce OFF
    await setModuleEnabled('ecommerce', false);
    const disabled = await isModuleEnabled('ecommerce');
    expect(disabled).toBe(false);
  });

  it('should return default state for registered core modules', async () => {
    const copilotEnabled = await isModuleEnabled('ai_copilot');
    expect(typeof copilotEnabled).toBe('boolean');
  });
});
