#!/usr/bin/env node

/**
 * Debug script for Pronumismatica form submission
 * This script tests the API route with comprehensive logging
 */

const path = require('path');
const fs = require('fs').promises;

async function testTemplateLoading() {
  console.log('=== Testing Template Loading ===');
  try {
    const filePath = path.join(process.cwd(), 'web', 'public', 'email.json');
    console.log('Looking for templates at:', filePath);
    
    const raw = await fs.readFile(filePath, 'utf8');
    const templates = JSON.parse(raw);
    
    console.log('Available templates:', Object.keys(templates));
    console.log('pronumismatica_form exists:', !!templates.pronumismatica_form);
    console.log('pronumismatica_form_with_images exists:', !!templates.pronumismatica_form_with_images);
    console.log('fallback_default exists:', !!templates.fallback_default);
    
    if (templates.pronumismatica_form) {
      console.log('pronumismatica_form template:', {
        subject: templates.pronumismatica_form.subject,
        hasHtml: !!templates.pronumismatica_form.html,
        hasText: !!templates.pronumismatica_form.text
      });
    }
    
    if (templates.pronumismatica_form_with_images) {
      console.log('pronumismatica_form_with_images template:', {
        subject: templates.pronumismatica_form_with_images.subject,
        hasHtml: !!templates.pronumismatica_form_with_images.html,
        hasText: !!templates.pronumismatica_form_with_images.text
      });
    }
    
    return templates;
  } catch (error) {
    console.error('Template loading failed:', error.message);
    return null;
  }
}

async function testSendGridConfig() {
  console.log('\n=== Testing SendGrid Configuration ===');
  
  const requiredEnvVars = [
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_APP_NAME'
  ];
  
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value ? '✓ Set' : '✗ Missing'}`);
  });
}

async function main() {
  console.log('Pronumismatica Form Debug Script');
  console.log('================================\n');
  
  // Test template loading
  const templates = await testTemplateLoading();
  
  // Test SendGrid configuration
  await testSendGridConfig();
  
  console.log('\n=== Analysis Summary ===');
  
  if (!templates) {
    console.log('❌ CRITICAL: Template loading failed - this is likely the root cause');
    console.log('   The API cannot send emails without valid templates');
  } else if (!templates.pronumismatica_form && !templates.pronumismatica_form_with_images) {
    console.log('❌ CRITICAL: No Pronumismatica templates found');
    console.log('   The API will fail when trying to send emails');
  } else {
    console.log('✅ Templates are available');
    
    // Check if SendGrid is configured
    const sendGridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM;
    
    if (!sendGridKey) {
      console.log('❌ CRITICAL: SendGrid API key is missing');
      console.log('   Email sending will fail without proper SendGrid configuration');
    } else if (!fromEmail) {
      console.log('⚠️  WARNING: SendGrid FROM_EMAIL is missing');
      console.log('   Emails may fail or use default sender');
    } else {
      console.log('✅ SendGrid configuration appears correct');
    }
  }
  
  console.log('\n=== Recommended Next Steps ===');
  console.log('1. Check server logs when submitting the form');
  console.log('2. Look for "PRONUMISMATICA API: Received request" to confirm API is being called');
  console.log('3. Check template loading logs');
  console.log('4. Verify SendGrid API key and configuration');
  console.log('5. Test with a simple form submission to see exact error');
}

main().catch(console.error);