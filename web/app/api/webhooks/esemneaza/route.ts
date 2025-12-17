import { NextRequest, NextResponse } from 'next/server';
import admin from '../../../../lib/firebase-admin';

/**
 * WEBHOOK HANDLER FOR ESEMNEAZA EVENTS
 *
 * This route receives webhook events from eSemneaza.ro when:
 * - A recipient signs the contract (RECIPIENT_SIGNED)
 * - All recipients sign and contract is complete (REQUEST_COMPLETED)
 * - A recipient rejects the contract (REQUEST_REJECTED)
 * - The request is canceled (REQUEST_CANCELED)
 *
 * Configure webhook URL in eSemneaza dashboard to point to:
 *   https://yourdomain.com/api/webhooks/esemneaza
 */

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    console.log(
      '📩 eSemneaza webhook received:',
      event.type,
      event.data?.requestId
    );

    switch (event.type) {
      case 'RECIPIENT_SIGNED':
        await handleRecipientSigned(event.data);
        break;

      case 'REQUEST_COMPLETED':
        await handleRequestCompleted(event.data);
        break;

      case 'REQUEST_REJECTED':
        await handleRequestRejected(event.data);
        break;

      case 'REQUEST_CANCELED':
        await handleRequestCanceled(event.data);
        break;

      default:
        console.log('⚠️  Unhandled eSemneaza event type:', event.type);
    }

    return NextResponse.json({
      received: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle individual recipient signature
 * Updates transaction to track which party has signed
 */
async function handleRecipientSigned(data: any) {
  const { requestId, recipientId, recipientName, recipientEmail } = data;

  const snapshot = await admin
    .firestore()
    .collection('transactions')
    .where('contractId', '==', requestId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const transaction = doc.data();

    const updatedRecipients = (transaction.contractRecipients || []).map(
      (r: any) =>
        r.id === recipientId
          ? { ...r, status: 'signed', signedAt: new Date().toISOString() }
          : r
    );

    await doc.ref.update({
      contractRecipients: updatedRecipients,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✍️  Contract ${requestId} signed by ${recipientName} (${recipientEmail})`
    );
  }
}

/**
 * Handle contract completion
 * Triggered when ALL recipients have signed
 */
async function handleRequestCompleted(data: any) {
  const { requestId, completedAt } = data;

  const snapshot = await admin
    .firestore()
    .collection('transactions')
    .where('contractId', '==', requestId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const transaction = doc.data();

    const updatedRecipients = (transaction.contractRecipients || []).map(
      (r: any) => ({
        ...r,
        status: 'signed',
        signedAt: r.signedAt || completedAt,
      })
    );

    await doc.ref.update({
      contractStatus: 'COMPLETED',
      contractRecipients: updatedRecipients,
      contractCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Contract ${requestId} fully completed`);
  }
}

/**
 * Handle contract rejection
 * Triggered when a recipient declines to sign
 */
async function handleRequestRejected(data: any) {
  const { requestId, recipientId, recipientName, recipientEmail, reason } = data;

  const snapshot = await admin
    .firestore()
    .collection('transactions')
    .where('contractId', '==', requestId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];

    await doc.ref.update({
      contractStatus: 'REJECTED',
      rejectedBy: {
        id: recipientId,
        name: recipientName,
        email: recipientEmail,
      },
      rejectionReason: reason || 'No reason provided',
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`❌ Contract ${requestId} rejected by ${recipientName}`);
  }
}

/**
 * Handle contract cancellation
 * Triggered when sender cancels the request
 */
async function handleRequestCanceled(data: any) {
  const { requestId } = data;

  const snapshot = await admin
    .firestore()
    .collection('transactions')
    .where('contractId', '==', requestId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];

    await doc.ref.update({
      contractStatus: 'CANCELED',
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`🚫 Contract ${requestId} canceled`);
  }
}

