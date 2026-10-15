/**
 * Unit Tests for Agent Tools
 *
 * Tests check_order_status, initiate_refund, and escalate_to_human
 * with mocked database calls to verify tool logic in isolation.
 *
 * Run:  node --experimental-vm-modules node_modules/.bin/jest tests/tools.test.js
 *   or: npx vitest run tests/tools.test.js
 */

import { jest } from '@jest/globals';

// ─── Mock the postgres pool ─────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.unstable_mockModule('../services/postgres.js', () => ({
  pool: { query: mockQuery },
}));

// ─── Mock the Session model (used by escalate_to_human) ─────────────────────
jest.unstable_mockModule('../models/Session.js', () => ({
  default: {
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

// ─── Mock the vectorStore (used by search_knowledge_base) ───────────────────
jest.unstable_mockModule('../rag/vectorStore.js', () => ({
  HybridRerankRetriever: jest.fn().mockImplementation(() => ({
    getRelevantDocuments: jest.fn().mockResolvedValue([]),
  })),
}));

// Dynamic imports after mocks are registered
const { checkOrderStatusTool, initiateRefundTool, escalateToHumanTool } =
  await import('../rag/tools.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('check_order_status tool', () => {
  beforeEach(() => mockQuery.mockReset());

  test('returns formatted order details for a valid order', async () => {
    mockQuery
      // First call: fetch order
      .mockResolvedValueOnce({
        rows: [{
          id: 5,
          status: 'shipped',
          total: '129.99',
          shipping_address: '42 Oak Street, Austin, TX',
          tracking_number: 'TRK-ABC12345',
          placed_at: '2026-06-01',
          processed_at: '2026-06-02',
          shipped_at: '2026-06-04',
          delivered_at: null,
          cancelled_at: null,
          customer_name: 'Alice Johnson',
        }],
      })
      // Second call: fetch items
      .mockResolvedValueOnce({
        rows: [
          { product_name: 'Wireless Earbuds', quantity: 1, unit_price: '49.99', subtotal: '49.99' },
          { product_name: 'USB-C Charger',    quantity: 2, unit_price: '29.99', subtotal: '59.98' },
        ],
      });

    const result = await checkOrderStatusTool.invoke({ orderId: '5' });

    expect(result).toContain('Order #5');
    expect(result).toContain('Alice Johnson');
    expect(result).toContain('SHIPPED');
    expect(result).toContain('TRK-ABC12345');
    expect(result).toContain('Wireless Earbuds');
    expect(result).toContain('$129.99');
  });

  test('returns "not found" for a non-existent order', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await checkOrderStatusTool.invoke({ orderId: '9999' });

    expect(result).toContain('Could not find');
    expect(result).toContain('9999');
  });

  test('rejects non-numeric order ID via schema validation', async () => {
    // Zod schema has regex /^\d+$/ — non-numeric should fail
    await expect(
      checkOrderStatusTool.invoke({ orderId: 'abc' })
    ).rejects.toThrow();
  });
});

describe('initiate_refund tool', () => {
  beforeEach(() => mockQuery.mockReset());

  test('returns eligibility prompt when confirmed=false', async () => {
    mockQuery
      // Fetch order
      .mockResolvedValueOnce({
        rows: [{ id: 10, status: 'delivered', total: '89.99', user_id: 1 }],
      })
      // Check existing refunds
      .mockResolvedValueOnce({ rows: [] });

    const result = await initiateRefundTool.invoke({
      orderId: '10',
      reason: 'Item damaged',
      confirmed: false,
    });

    expect(result).toContain('$89.99');
    expect(result).toContain('INSTRUCTION TO AGENT');
    expect(result).toContain('confirm');
  });

  test('creates refund record when confirmed=true', async () => {
    mockQuery
      // Fetch order
      .mockResolvedValueOnce({
        rows: [{ id: 10, status: 'delivered', total: '89.99', user_id: 1 }],
      })
      // Check existing refunds
      .mockResolvedValueOnce({ rows: [] })
      // Insert refund
      .mockResolvedValueOnce({
        rows: [{ id: 42, amount: '89.99', requested_at: '2026-07-01' }],
      });

    const result = await initiateRefundTool.invoke({
      orderId: '10',
      reason: 'Item damaged',
      confirmed: true,
    });

    expect(result).toContain('Refund #42');
    expect(result).toContain('$89.99');
    expect(result).toContain('PENDING');
    // Verify INSERT was called
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO refunds');
  });

  test('rejects refund for already-cancelled order', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 10, status: 'cancelled', total: '89.99', user_id: 1 }],
    });

    const result = await initiateRefundTool.invoke({
      orderId: '10',
      reason: 'Changed mind',
      confirmed: false,
    });

    expect(result).toContain('already been cancelled');
  });

  test('prevents duplicate refund', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 10, status: 'delivered', total: '89.99', user_id: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 99, status: 'pending', amount: '89.99' }],
      });

    const result = await initiateRefundTool.invoke({
      orderId: '10',
      reason: 'Duplicate test',
      confirmed: false,
    });

    expect(result).toContain('already');
    expect(result).toContain('#99');
  });
});

describe('escalate_to_human tool', () => {
  beforeEach(() => mockQuery.mockReset());

  test('creates a ticket and returns confirmation', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 7, created_at: '2026-07-01' }],
    });

    const result = await escalateToHumanTool.invoke({
      issueSummary: 'Customer wants to speak with a manager',
    });

    expect(result).toContain('ESCALATION_TRIGGERED');
    expect(result).toContain('#7');
    expect(result).toContain('speak with a manager');
  });

  test('returns fallback message on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const result = await escalateToHumanTool.invoke({
      issueSummary: 'Urgent issue',
    });

    expect(result).toContain('ESCALATION_TRIGGERED');
    expect(result).toContain('Urgent issue');
    expect(result).toContain('error');
  });
});
