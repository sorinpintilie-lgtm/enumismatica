/**
 * FIREBASE CLOUD FUNCTIONS FOR CONTRACT AUTOMATION
 *
 * This file contains Cloud Functions that automatically:
 * 1. Detect when a transaction is completed (direct buy or auction)
 * 2. Fill a PDF contract template with transaction details
 * 3. Upload the contract to eSemneaza.ro for electronic signature
 * 4. Track signature status via webhooks (via the Next.js app)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const FormData = require('form-data');

// Initialize Firebase Admin SDK (uses default project & storage bucket)
admin.initializeApp();

// eSemneaza API Configuration (API key is loaded from environment)
const ESEMNEAZA_API_KEY =
  (functions.config().esemneaza && functions.config().esemneaza.api_key) ||
  process.env.ESEMNEAZA_API_KEY;

if (!ESEMNEAZA_API_KEY) {
  console.warn(
    '⚠️  ESEMNEAZA_API_KEY is not set. eSemneaza integration will fail until this key is configured.'
  );
}

const ESEMNEAZA_CONFIG = {
  apiKey: ESEMNEAZA_API_KEY,
  baseUrl: 'https://app.esemneaza.ro/api/v1',
};

/**
 * downloadContractTemplate()
 *
 * Downloads the contract template from Firebase Storage.
 * Template is stored at: contracts/templates/contract-template.pdf
 *
 * @returns {Promise<Buffer>} PDF template as buffer
 */
async function downloadContractTemplate() {
  try {
    const bucket = admin.storage().bucket();
    const templateFile = bucket.file('contracts/templates/contract-template.pdf');

    const [templateBuffer] = await templateFile.download();
    console.log('✅ Contract template downloaded from Storage');

    return templateBuffer;
  } catch (error) {
    console.error('❌ Error downloading template:', error);
    throw new Error('Failed to download contract template');
  }
}

/**
 * fillContractTemplate()
 *
 * Fills the PDF template with transaction data using pdf-lib.
 * The template must have fillable form fields with these names:
 * - contractNumber, contractDate
 * - sellerName, sellerEmail, sellerPhone, sellerAddress
 * - buyerName, buyerEmail, buyerPhone, buyerAddress
 * - productName, productDescription, price, transactionType
 *
 * @param {Object} transactionData - Transaction details
 * @returns {Promise<admin.storage.File>} Uploaded contract file reference
 */
async function fillContractTemplate(transactionData) {
  try {
    // Download template from Storage
    const templateBytes = await downloadContractTemplate();

    // Load PDF template
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Prepare data to fill
    const fields = {
      contractNumber: transactionData.transactionId,
      contractDate: new Date().toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      sellerName: (transactionData.seller && transactionData.seller.name) || '',
      sellerEmail:
        (transactionData.seller && transactionData.seller.email) || '',
      sellerPhone:
        (transactionData.seller && transactionData.seller.phone) || '',
      sellerAddress:
        (transactionData.seller && transactionData.seller.address) || '',
      buyerName: (transactionData.buyer && transactionData.buyer.name) || '',
      buyerEmail: (transactionData.buyer && transactionData.buyer.email) || '',
      buyerPhone: (transactionData.buyer && transactionData.buyer.phone) || '',
      buyerAddress:
        (transactionData.buyer && transactionData.buyer.address) || '',
      productName: (transactionData.product && transactionData.product.name) || '',
      productDescription:
        (transactionData.product && transactionData.product.description) || '',
      price: `${transactionData.price} RON`,
      transactionType:
        transactionData.type === 'auction' ? 'Licitație' : 'Cumpărare directă',
    };

    // Fill each field in the PDF
    Object.entries(fields).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value));
        console.log(`✓ Filled field: ${fieldName}`);
      } catch (e) {
        console.warn(`⚠️ Field "${fieldName}" not found in template`);
      }
    });

    // Save filled PDF
    const pdfBytes = await pdfDoc.save();

    // Upload to Firebase Storage
    const fileName = `contract-${transactionData.transactionId}-${Date.now()}.pdf`;
    const bucket = admin.storage().bucket();
    const file = bucket.file(`contracts/${fileName}`);

    await file.save(Buffer.from(pdfBytes), {
      contentType: 'application/pdf',
      metadata: {
        transactionId: transactionData.transactionId,
        generatedAt: new Date().toISOString(),
        type: 'contract',
      },
    });

    console.log(`✅ Contract generated: ${fileName}`);
    return file;
  } catch (error) {
    console.error('❌ Error filling contract template:', error);
    throw error;
  }
}

/**
 * sendToEsemneaza()
 *
 * Uploads the contract to eSemneaza.ro and creates a sign request.
 *
 * Process:
 * 1. Download contract from Firebase Storage
 * 2. Upload to eSemneaza via /api/v1/files endpoint
 * 3. Create sign request via /api/v1/requests endpoint
 * 4. Send email notifications to buyer and seller
 *
 * @param {admin.storage.File} contractFile - Firebase Storage file reference
 * @param {Object} transactionData - Transaction details
 * @returns {Promise<Object>} eSemneaza sign request response
 */
async function sendToEsemneaza(contractFile, transactionData) {
  try {
    if (!ESEMNEAZA_CONFIG.apiKey) {
      throw new Error(
        'ESEMNEAZA_API_KEY is not configured. Set it via firebase functions:config or environment variables.'
      );
    }

    // Download contract from Firebase Storage
    const [fileBuffer] = await contractFile.download();

    // STEP 1: Upload file to eSemneaza
    console.log('📤 Uploading contract to eSemneaza...');

    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: `contract-${transactionData.transactionId}.pdf`,
      contentType: 'application/pdf',
    });

    const uploadResponse = await axios.post(
      `${ESEMNEAZA_CONFIG.baseUrl}/files`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${ESEMNEAZA_CONFIG.apiKey}`,
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ File uploaded to eSemneaza:', uploadResponse.data);
    const { fileName } = uploadResponse.data;

    // STEP 2: Create sign request
    console.log('📝 Creating sign request...');

    const signRequestPayload = {
      fileName: fileName, // From step 1
      recipients: [
        {
          type: 'EMAIL',
          email: transactionData.seller.email,
          name: transactionData.seller.name,
          options: ['one_click_sign'], // Enable one-click signing
          metaData: {
            role: 'seller',
            userId: transactionData.seller.id,
          },
        },
        {
          type: 'EMAIL',
          email: transactionData.buyer.email,
          name: transactionData.buyer.name,
          options: ['one_click_sign'],
          metaData: {
            role: 'buyer',
            userId: transactionData.buyer.id,
          },
        },
      ],
      signInOrder: false, // Both can sign simultaneously
      extractTags: true, // Auto-extract signature fields from PDF
      senderName: 'Platforma de Licitații',
      emailSubject: `Contract Tranzacție #${transactionData.transactionId}`,
      emailMessage: `Bună ziua,\n\nVă rugăm să semnați contractul de ${
        transactionData.type === 'auction' ? 'licitație' : 'vânzare-cumpărare'
      } pentru produsul: ${transactionData.product.name}\n\nPreț final: ${
        transactionData.price
      } RON\n\nVă mulțumim!`,
      tags: ['contract', transactionData.type, `transaction-${transactionData.transactionId}`],
    };

    const signResponse = await axios.post(
      `${ESEMNEAZA_CONFIG.baseUrl}/requests`,
      signRequestPayload,
      {
        headers: {
          Authorization: `Bearer ${ESEMNEAZA_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ Sign request created:', signResponse.data.id);
    return signResponse.data;
  } catch (error) {
    console.error('❌ eSemneaza API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * onTransactionComplete
 *
 * TRIGGER: Firestore document update on transactions/{transactionId}
 * CONDITION: When status changes from any value to 'completed'
 *
 * This function:
 * 1. Detects completed transactions (direct buy or auction)
 * 2. Fetches buyer, seller, and product data from Firestore
 * 3. Fills contract template with transaction data
 * 4. Sends contract to eSemneaza for electronic signature
 * 5. Updates transaction with contract tracking info
 */
exports.onTransactionComplete = functions
  .region('europe-west1')
  .firestore.document('transactions/{transactionId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Only trigger when status changes to 'completed'
    if (newData.status === 'completed' && oldData.status !== 'completed') {
      const transactionId = context.params.transactionId;
      console.log(`🚀 Transaction completed: ${transactionId}`);

      try {
        // Fetch all required data from Firestore
        const [buyerDoc, sellerDoc, productDoc] = await Promise.all([
          admin.firestore().collection('users').doc(newData.buyerId).get(),
          admin.firestore().collection('users').doc(newData.sellerId).get(),
          admin.firestore().collection('products').doc(newData.productId).get(),
        ]);

        // Validate all documents exist
        if (!buyerDoc.exists || !sellerDoc.exists || !productDoc.exists) {
          throw new Error('Missing required user or product data');
        }

        // Prepare transaction data
        const transactionData = {
          transactionId,
          type: newData.type || 'direct_buy',
          price: newData.price || newData.finalPrice,
          buyer: {
            id: newData.buyerId,
            ...buyerDoc.data(),
          },
          seller: {
            id: newData.sellerId,
            ...sellerDoc.data(),
          },
          product: productDoc.data(),
        };

        // STEP 1: Generate contract from template
        console.log('📄 Generating contract from template...');
        const contractFile = await fillContractTemplate(transactionData);

        // STEP 2: Send to eSemneaza for signing
        console.log('📧 Sending to eSemneaza...');
        const signResponse = await sendToEsemneaza(contractFile, transactionData);

        // STEP 3: Update transaction with contract info
        await change.after.ref.update({
          contractId: signResponse.id,
          contractStatus: 'IN_PROGRESS',
          contractFileName: signResponse.fileName,
          contractCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
          contractRecipients: signResponse.recipients.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            signUrl: r.signUrl,
            status: 'pending',
          })),
          contractError: null,
        });

        console.log(`✅ Contract successfully sent for transaction ${transactionId}`);
      } catch (error) {
        console.error(`❌ Error processing transaction ${transactionId}:`, error);

        // Log error to Firestore
        await change.after.ref.update({
          contractStatus: 'error',
          contractError: error.message,
          contractErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  });

/**
 * getCompletedContract
 *
 * TYPE: Callable HTTPS Function
 * AUTH: Required
 *
 * Allows authenticated users to retrieve download URL for completed contracts.
 * Only buyer or seller can access their transaction's contract.
 */
exports.getCompletedContract = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { transactionId } = data;

    try {
      // Get transaction from Firestore
      const transactionDoc = await admin
        .firestore()
        .collection('transactions')
        .doc(transactionId)
        .get();

      if (!transactionDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Transaction not found'
        );
      }

      const transaction = transactionDoc.data();

      // Verify user is buyer or seller
      if (
        transaction.buyerId !== context.auth.uid &&
        transaction.sellerId !== context.auth.uid
      ) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Access denied to this contract'
        );
      }

      // Check if contract is completed (webhook should update this field)
      if (transaction.contractStatus !== 'COMPLETED') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Contract not yet completed'
        );
      }

      if (!ESEMNEAZA_CONFIG.apiKey) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'ESEMNEAZA_API_KEY is not configured on the server'
        );
      }

      // Get download URL from eSemneaza
      const response = await axios.get(
        `${ESEMNEAZA_CONFIG.baseUrl}/requests/${transaction.contractId}/completed_download_url`,
        {
          headers: {
            Authorization: `Bearer ${ESEMNEAZA_CONFIG.apiKey}`,
            Accept: 'application/json',
          },
          timeout: 30000,
        }
      );

      return {
        downloadUrl: response.data.docUrl,
        expiresIn: '7 days',
        contractId: transaction.contractId,
      };
    } catch (error) {
      console.error('Error getting completed contract:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

