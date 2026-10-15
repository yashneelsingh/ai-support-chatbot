async function testChat(message) {
  try {
    console.log(`\n🗣️  User: ${message}`);
    const res = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    console.log(`🤖 Bot: ${data.reply}`);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

async function runTests() {
  await testChat('Where is my order #5?');
  await testChat('I want a refund for order #3');
  await testChat('What is your return policy?');
  await testChat('I want to speak to a manager!');
}

runTests();
