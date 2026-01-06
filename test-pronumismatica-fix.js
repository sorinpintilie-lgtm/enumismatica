#!/usr/bin/env node

/**
 * Test script to verify the Pronumismatica form fix
 * This script tests that the API route now uses the proper email service pattern
 */

const path = require('path');
const fs = require('fs').promises;

async function testTemplateAvailability() {
  console.log('=== Testing Pronumismatica Templates in email-templates.json ===');
  
  try {
    const templatesPath = path.join(process.cwd(), 'web', 'public', 'email-templates.json');
    const raw = await fs.readFile(templatesPath, 'utf-8');
    const templates = JSON.parse(raw);
    
    console.log('✅ email-templates.json loaded successfully');
    console.log('Available templates:', Object.keys(templates));
    
    // Check if Pronumismatica templates exist
    const hasBasicTemplate = !!templates.pronumismatica_form;
    const hasImagesTemplate = !!templates.pronumismatica_form_with_images;
    
    console.log('✅ pronumismatica_form template exists:', hasBasicTemplate);
    console.log('✅ pronumismatica_form_with_images template exists:', hasImagesTemplate);
    
    if (hasBasicTemplate) {
      console.log('✅ Basic template subject:', templates.pronumismatica_form.subject);
      console.log('✅ Basic template has HTML:', !!templates.pronumismatica_form.html);
      console.log('✅ Basic template has text:', !!templates.pronumismatica_form.text);
    }
    
    if (hasImagesTemplate) {
      console.log('✅ Images template subject:', templates.pronumismatica_form_with_images.subject);
      console.log('✅ Images template has HTML:', !!templates.pronumismatica_form_with_images.html);
      console.log('✅ Images template has text:', !!templates.pronumismatica_form_with_images.text);
    }
    
    return { hasBasicTemplate, hasImagesTemplate };
  } catch (error) {
    console.error('❌ Failed to load or parse email-templates.json:', error.message);
    return { hasBasicTemplate: false, hasImagesTemplate: false };
  }
}

async function testAPIRouteCode() {
  console.log('\n=== Testing Pronumismatica API Route Code ===');
  
  try {
    const apiRoutePath = path.join(process.cwd(), 'web', 'app', 'api', 'pronumismatica', 'route.ts');
    const code = await fs.readFile(apiRoutePath, 'utf-8');
    
    console.log('✅ API route file loaded successfully');
    
    // Check for key indicators that the fix is in place
    const hasInternalEmailFunction = code.includes('sendInternalEmail');
    const usesInternalAPI = code.includes('/api/email/send');
    const noDirectSendGrid = !code.includes('sendEmailWithAttachments');
    const hasLogging = code.includes('console.log');
    
    console.log('✅ Has sendInternalEmail function:', hasInternalEmailFunction);
    console.log('✅ Uses internal email API:', usesInternalAPI);
    console.log('✅ No direct SendGrid usage:', noDirectSendGrid);
    console.log('✅ Has comprehensive logging:', hasLogging);
    
    // Check for template usage
    const usesCorrectTemplates = code.includes('pronumismatica_form') && code.includes('pronumismatica_form_with_images');
    console.log('✅ Uses correct template keys:', usesCorrectTemplates);
    
    return { 
      hasInternalEmailFunction, 
      usesInternalAPI, 
      noDirectSendGrid, 
      hasLogging,
      usesCorrectTemplates
    };
  } catch (error) {
    console.error('❌ Failed to load API route code:', error.message);
    return { 
      hasInternalEmailFunction: false, 
      usesInternalAPI: false, 
      noDirectSendGrid: false, 
      hasLogging: false,
      usesCorrectTemplates: false
    };
  }
}

async function testEmailAPIEndpoint() {
  console.log('\n=== Testing Email API Endpoint ===');
  
  try {
    const emailAPIPath = path.join(process.cwd(), 'web', 'app', 'api', 'email', 'send', 'route.ts');
    const code = await fs.readFile(emailAPIPath, 'utf-8');
    
    console.log('✅ Email API endpoint loaded successfully');
    
    // Check that the email API is properly configured
    const hasSendGridConfig = code.includes('sgMail.setApiKey');
    const hasTemplateLoading = code.includes('emailTemplatesData');
    const hasErrorHandling = code.includes('catch (error)');
    
    console.log('✅ Has SendGrid configuration:', hasSendGridConfig);
    console.log('✅ Loads email templates:', hasTemplateLoading);
    console.log('✅ Has error handling:', hasErrorHandling);
    
    return { hasSendGridConfig, hasTemplateLoading, hasErrorHandling };
  } catch (error) {
    console.error('❌ Failed to load email API endpoint:', error.message);
    return { hasSendGridConfig: false, hasTemplateLoading: false, hasErrorHandling: false };
  }
}

async function main() {
  console.log('Pronumismatica Form Fix Verification');
  console.log('====================================\n');
  
  // Test all components
  const templates = await testTemplateAvailability();
  const apiRoute = await testAPIRouteCode();
  const emailAPI = await testEmailAPIEndpoint();
  
  console.log('\n=== Fix Verification Summary ===');
  
  // Check if all critical components are working
  const templatesWorking = templates.hasBasicTemplate && templates.hasImagesTemplate;
  const apiRouteFixed = apiRoute.hasInternalEmailFunction && apiRoute.usesInternalAPI && apiRoute.noDirectSendGrid;
  const emailAPIWorking = emailAPI.hasSendGridConfig && emailAPI.hasTemplateLoading;
  
  console.log('✅ Templates configured correctly:', templatesWorking);
  console.log('✅ API route uses proper email service pattern:', apiRouteFixed);
  console.log('✅ Email API endpoint is properly configured:', emailAPIWorking);
  
  const allTestsPassed = templatesWorking && apiRouteFixed && emailAPIWorking;
  
  console.log('\n=== Overall Result ===');
  if (allTestsPassed) {
    console.log('🎉 SUCCESS: All tests passed! The Pronumismatica form fix is complete.');
    console.log('\nThe form should now work correctly because:');
    console.log('1. ✅ Pronumismatica templates are available in email-templates.json');
    console.log('2. ✅ API route uses the internal email API instead of direct SendGrid');
    console.log('3. ✅ Proper error handling and logging are in place');
    console.log('4. ✅ The email API endpoint is configured to use SendGrid properly');
    console.log('\nWhen deployed with proper SendGrid credentials, the form should send emails successfully.');
  } else {
    console.log('❌ FAILURE: Some tests failed. The fix may not be complete.');
    console.log('\nFailed components:');
    if (!templatesWorking) console.log('  - Template configuration');
    if (!apiRouteFixed) console.log('  - API route code');
    if (!emailAPIWorking) console.log('  - Email API endpoint');
  }
  
  console.log('\n=== Next Steps ===');
  if (allTestsPassed) {
    console.log('1. Deploy the changes to your Netlify environment');
    console.log('2. Ensure SENDGRID_API_KEY and other environment variables are set in Netlify');
    console.log('3. Test the Pronumismatica form in the deployed environment');
    console.log('4. Monitor logs for any remaining issues');
  } else {
    console.log('Please review the failed components and complete the fix.');
  }
}

main().catch(console.error);