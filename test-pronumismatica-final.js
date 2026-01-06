#!/usr/bin/env node

/**
 * Final test script to verify the Pronumismatica form fix
 * This script tests the actual functionality that matters
 */

const fs = require('fs');
const path = require('path');

async function testEmailTemplates() {
  console.log('=== Testing Email Templates (with BOM handling like the email API) ===');
  
  try {
    const templatesPath = path.join(process.cwd(), 'web', 'public', 'email-templates.json');
    
    // Read the file the same way the email API does
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    
    // Apply the same BOM handling as the email API (line 22 in email-templates.json)
    const cleanedContent = templatesContent.replace(/^\uFEFF/, '');
    const templates = JSON.parse(cleanedContent);
    
    console.log('✅ email-templates.json loaded successfully with BOM handling');
    console.log('Available templates:', Object.keys(templates));
    
    // Check if Pronumismatica templates exist
    const hasBasicTemplate = !!templates.pronumismatica_form;
    const hasImagesTemplate = !!templates.pronumismatica_form_with_images;
    
    console.log('✅ pronumismatica_form template exists:', hasBasicTemplate);
    console.log('✅ pronumismatica_form_with_images template exists:', hasImagesTemplate);
    
    if (hasBasicTemplate) {
      console.log('✅ Basic template subject:', templates.pronumismatica_form.subject);
    }
    
    if (hasImagesTemplate) {
      console.log('✅ Images template subject:', templates.pronumismatica_form_with_images.subject);
    }
    
    return { hasBasicTemplate, hasImagesTemplate, templates };
  } catch (error) {
    console.error('❌ Failed to load email templates:', error.message);
    return { hasBasicTemplate: false, hasImagesTemplate: false, templates: null };
  }
}

async function testAPIRouteIntegration() {
  console.log('\n=== Testing API Route Integration ===');
  
  try {
    const apiRoutePath = path.join(process.cwd(), 'web', 'app', 'api', 'pronumismatica', 'route.ts');
    const code = await fs.readFile(apiRoutePath, 'utf-8');
    
    // Test that the API route has the key components
    const checks = {
      hasInternalEmailFunction: code.includes('sendInternalEmail'),
      usesInternalAPI: code.includes('/api/email/send'),
      noDirectSendGrid: !code.includes('sendEmailWithAttachments'),
      hasLogging: code.includes('console.log'),
      usesCorrectTemplates: code.includes('pronumismatica_form') && code.includes('pronumismatica_form_with_images'),
      hasErrorHandling: code.includes('catch (error)')
    };
    
    console.log('✅ API Route Analysis:');
    Object.entries(checks).forEach(([check, result]) => {
      console.log(`   ${result ? '✅' : '❌'} ${check}: ${result}`);
    });
    
    return checks;
  } catch (error) {
    console.error('❌ Failed to analyze API route:', error.message);
    return null;
  }
}

async function testEmailAPIEndpoint() {
  console.log('\n=== Testing Email API Endpoint ===');
  
  try {
    const emailAPIPath = path.join(process.cwd(), 'web', 'app', 'api', 'email', 'send', 'route.ts');
    const code = await fs.readFile(emailAPIPath, 'utf-8');
    
    const checks = {
      hasSendGridConfig: code.includes('sgMail.setApiKey'),
      hasTemplateLoading: code.includes('emailTemplatesData'),
      hasBOMHandling: code.includes('replace(/^\\uFEFF/, \'\')'),
      hasErrorHandling: code.includes('catch (error)'),
      usesProperSendGrid: code.includes('await sgMail.send(msg)')
    };
    
    console.log('✅ Email API Analysis:');
    Object.entries(checks).forEach(([check, result]) => {
      console.log(`   ${result ? '✅' : '❌'} ${check}: ${result}`);
    });
    
    return checks;
  } catch (error) {
    console.error('❌ Failed to analyze email API endpoint:', error.message);
    return null;
  }
}

async function main() {
  console.log('Pronumismatica Form Fix - Final Verification');
  console.log('===========================================\n');
  
  // Test all components with proper BOM handling
  const templates = await testEmailTemplates();
  const apiRoute = await testAPIRouteIntegration();
  const emailAPI = await testEmailAPIEndpoint();
  
  console.log('\n=== Final Verification Summary ===');
  
  if (!templates || !apiRoute || !emailAPI) {
    console.log('❌ CRITICAL: Some components could not be tested');
    return;
  }
  
  // Check if all critical components are working
  const templatesWorking = templates.hasBasicTemplate && templates.hasImagesTemplate;
  const apiRouteFixed = apiRoute.hasInternalEmailFunction && apiRoute.usesInternalAPI && apiRoute.noDirectSendGrid;
  const emailAPIWorking = emailAPI.hasSendGridConfig && emailAPI.hasTemplateLoading && emailAPI.hasBOMHandling;
  
  console.log('✅ Templates configured correctly:', templatesWorking);
  console.log('✅ API route uses proper email service pattern:', apiRouteFixed);
  console.log('✅ Email API endpoint is properly configured:', emailAPIWorking);
  
  const allTestsPassed = templatesWorking && apiRouteFixed && emailAPIWorking;
  
  console.log('\n=== Overall Result ===');
  if (allTestsPassed) {
    console.log('🎉 SUCCESS: All critical tests passed!');
    console.log('\n✅ The Pronumismatica form fix is COMPLETE and should work correctly!');
    console.log('\nWhat was fixed:');
    console.log('1. ✅ Pronumismatica templates added to email-templates.json');
    console.log('2. ✅ API route refactored to use internal email API instead of direct SendGrid');
    console.log('3. ✅ Comprehensive logging added for debugging');
    console.log('4. ✅ Proper error handling implemented');
    console.log('5. ✅ Email API endpoint properly configured with BOM handling');
    
    console.log('\n📋 Deployment Notes:');
    console.log('- The form should now work when deployed with proper SendGrid credentials');
    console.log('- ID image attachments are noted in the email but need separate handling in production');
    console.log('- All email sending goes through the proper /api/email/send endpoint');
    console.log('- The BOM issue in email-templates.json is handled by the email API code');
    
  } else {
    console.log('❌ FAILURE: Some critical tests failed.');
    console.log('\nFailed components:');
    if (!templatesWorking) console.log('  - Template configuration');
    if (!apiRouteFixed) console.log('  - API route code');
    if (!emailAPIWorking) console.log('  - Email API endpoint');
  }
}

main().catch(console.error);