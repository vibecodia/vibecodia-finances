import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { reductionAlertSchema } from '../db/models/reductionAlert.js';

describe('ReductionAlert Model & Schema', () => {
  test('collection name is explicitly configured as reductioin_alerts', () => {
    assert.equal(reductionAlertSchema.get('collection'), 'reductioin_alerts');
  });

  test('default schema values are properly initialized', () => {
    assert.equal(reductionAlertSchema.path('enabled').defaultValue, false);
    assert.deepEqual(reductionAlertSchema.path('monitoredPaymentMethods').defaultValue(), []);
    assert.deepEqual(reductionAlertSchema.path('plansByMonth').defaultValue(), {});
  });
});
