import { jest } from '@jest/globals';

const invokeModel = jest.fn();
const invokeTool = jest.fn();
const writeAuditLog = jest.fn();

jest.unstable_mockModule('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    bindTools: jest.fn(() => ({ invoke: invokeModel })),
  })),
}));

jest.unstable_mockModule('../rag/tools.js', () => ({
  agentTools: [{ name: 'test_tool', invoke: invokeTool }],
}));

jest.unstable_mockModule('../middleware/auditLogger.js', () => ({ writeAuditLog }));

const { getAgentExecutor, clearAgentSession } = await import('../rag/agent.js');

describe('agent executor', () => {
  beforeEach(() => {
    invokeModel.mockReset();
    invokeTool.mockReset();
    writeAuditLog.mockReset();
    clearAgentSession('agent-test-session');
  });

  test('returns a direct model response and includes the session ID in the system prompt', async () => {
    invokeModel.mockResolvedValueOnce({ content: 'Hello from support', tool_calls: [] });

    const executor = await getAgentExecutor('agent-test-session');
    await expect(executor.invoke({ input: 'Hello' })).resolves.toEqual({
      output: 'Hello from support',
    });

    const messages = invokeModel.mock.calls[0][0];
    expect(messages[0].content).toContain('agent-test-session');
  });

  test('executes requested tools, returns the final answer, and writes audit events', async () => {
    invokeModel
      .mockResolvedValueOnce({
        content: '',
        tool_calls: [{ id: 'call-1', name: 'test_tool', args: { value: 42 } }],
      })
      .mockResolvedValueOnce({ content: 'Tool completed', tool_calls: [] });
    invokeTool.mockResolvedValueOnce('tool result');

    const executor = await getAgentExecutor('agent-test-session');
    await expect(executor.invoke({ input: 'Use the tool' })).resolves.toEqual({
      output: 'Tool completed',
    });

    expect(invokeTool).toHaveBeenCalledWith({ value: 42 });
    expect(writeAuditLog).toHaveBeenCalledTimes(2);
    expect(invokeModel.mock.calls[1][0].at(-2).content).toBe('tool result');
  });
});
