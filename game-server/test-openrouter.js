require('dotenv').config();
const openRouterService = require('./src/services/openrouterService');

async function testOpenRouter() {
  console.log('Testing OpenRouter integration...\n');

  try {
    // Test 1: Basic story generation
    console.log('Test 1: Basic story generation');
    const basicResponse = await openRouterService.generateResponse(
      "Player: I want to explore the mysterious forest.\n\nAs the DM, respond to this:",
      'gpt4o-mini',
      false,
      'en',
      'DM'
    );
    console.log('Response:', basicResponse);
    console.log('✅ Basic story generation works\n');

    // Test 2: Kids mode
    console.log('Test 2: Kids mode story generation');
    const kidsResponse = await openRouterService.generateResponse(
      "Player: I want to go on an adventure!\n\nAs the DM, respond to this:",
      'gpt4o-mini',
      true,
      'en',
      'DM'
    );
    console.log('Response:', kidsResponse);
    console.log('✅ Kids mode works\n');

    // Test 3: Different language
    console.log('Test 3: Spanish language response');
    const spanishResponse = await openRouterService.generateResponse(
      "Player: Quiero explorar el castillo.\n\nAs the DM, respond to this:",
      'gpt4o-mini',
      false,
      'es',
      'DM'
    );
    console.log('Response:', spanishResponse);
    console.log('✅ Multi-language support works\n');

    // Test 4: Available models
    console.log('Test 4: Available models');
    const models = openRouterService.getAvailableModels();
    console.log('Available models:', models);
    console.log('✅ Model listing works\n');

    console.log('🎉 All tests passed! OpenRouter integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('OPENROUTER_API_KEY')) {
      console.log('\n💡 Make sure to set your OPENROUTER_API_KEY in the .env file');
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Check that your OpenRouter API key is valid and has sufficient credits');
    }
    
    process.exit(1);
  }
}

// Run the test
testOpenRouter(); 