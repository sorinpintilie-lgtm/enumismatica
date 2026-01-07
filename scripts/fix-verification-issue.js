#!/usr/bin/env node

/**
 * Script to diagnose and fix the verification request issue
 * 
 * This script:
 * 1. Checks if the Firestore index exists for the verification query
 * 2. Provides instructions for deploying the fix
 * 3. Can be used to test the verification system
 */

const fs = require('fs');
const path = require('path');

console.log('=== Verification Request Issue Diagnosis ===\n');

// Check if the index has been added
const indexesPath = path.join(__dirname, '../firestore.indexes.json');
const indexesContent = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));

const hasVerificationIndex = indexesContent.indexes.some(index => {
  return index.collectionGroup === 'users' &&
         index.fields.some(field => field.fieldPath === 'idVerificationStatus') &&
         index.fields.some(field => field.fieldPath === 'updatedAt');
});

if (hasVerificationIndex) {
  console.log('✅ Verification index found in firestore.indexes.json');
  console.log('\nTo deploy the index fix:');
  console.log('1. Run: firebase login --reauth');
  console.log('2. Run: firebase deploy --only firestore:indexes');
  console.log('\nThis will create the required composite index for querying users with pending verification.');
} else {
  console.log('❌ Verification index NOT found in firestore.indexes.json');
  console.log('\nThe index needs to be added manually. Add this to firestore.indexes.json:');
  console.log(JSON.stringify({
    "collectionGroup": "users",
    "queryScope": "COLLECTION",
    "fields": [
      {
        "fieldPath": "idVerificationStatus",
        "order": "ASCENDING"
      },
      {
        "fieldPath": "updatedAt",
        "order": "DESCENDING"
      }
    ]
  }, null, 2));
}

console.log('\n=== Additional Checks ===\n');

// Check the admin service function
const adminServicePath = path.join(__dirname, '../shared/adminService.ts');
const adminServiceContent = fs.readFileSync(adminServicePath, 'utf8');

if (adminServiceContent.includes('getUsersWithPendingVerification')) {
  console.log('✅ getUsersWithPendingVerification function exists in adminService');
} else {
  console.log('❌ getUsersWithPendingVerification function NOT found in adminService');
}

// Check the verification page
const verificationPagePath = path.join(__dirname, '../web/app/admin/verification/page.tsx');
const verificationPageContent = fs.readFileSync(verificationPagePath, 'utf8');

if (verificationPageContent.includes('getUsersWithPendingVerification')) {
  console.log('✅ Verification page is using getUsersWithPendingVerification');
} else {
  console.log('❌ Verification page is NOT using getUsersWithPendingVerification');
}

console.log('\n=== Troubleshooting Steps ===\n');
console.log('1. Ensure users have idVerificationStatus set to "pending" when they submit documents');
console.log('2. Check Firestore rules allow admin to read user documents');
console.log('3. Verify the composite index is deployed');
console.log('4. Test the query directly in Firestore console');

console.log('\n=== Manual Testing ===\n');
console.log('You can test the verification query manually using:');
console.log('const q = query(');
console.log('  collection(db, "users"),');
console.log('  where("idVerificationStatus", "==", "pending"),');
console.log('  orderBy("updatedAt", "desc")');
console.log(');');
console.log('const snapshot = await getDocs(q);');
console.log('console.log("Pending verifications:", snapshot.size);');