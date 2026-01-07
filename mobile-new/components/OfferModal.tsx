import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native'
import { createOffer } from '../../shared/offerService'

type OfferModalProps = {
  isOpen: boolean
  onClose: () => void
  itemType: 'product' | 'auction'
  itemId: string
  itemName: string
  currentPrice: number
  buyerId: string
}

export default function OfferModal({ 
  isOpen, 
  onClose, 
  itemType, 
  itemId, 
  itemName, 
  currentPrice, 
  buyerId
}: OfferModalProps) {
  const [offerAmount, setOfferAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmitOffer = async () => {
    if (!offerAmount || isNaN(parseFloat(offerAmount))) {
      setError('Please enter a valid offer amount')
      return
    }

    const amount = parseFloat(offerAmount)
    if (amount <= 0) {
      setError('Offer amount must be greater than 0')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await createOffer(itemType, itemId, buyerId, amount)

      Alert.alert('Offer Submitted', 'Your offer has been submitted successfully!')
      onClose()
    } catch (err) {
      console.error('Failed to submit offer:', err)
      setError('Failed to submit offer. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal 
      visible={isOpen} 
      animationType="slide" 
      transparent={true} 
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Make an Offer</Text>
          <Text style={styles.itemName}>{itemName}</Text>
          <Text style={styles.currentPrice}>Current Price: €{currentPrice.toFixed(2)}</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your offer amount (EUR)"
            keyboardType="numeric"
            value={offerAmount}
            onChangeText={setOfferAmount}
            placeholderTextColor="#94a3b8"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmitOffer}
              disabled={isSubmitting || !offerAmount}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Offer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#0a192f',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center'
  },
  itemName: {
    fontSize: 16,
    color: '#e7b73c',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600'
  },
  currentPrice: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 16
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569'
  },
  submitButton: {
    backgroundColor: '#e7b73c'
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  }
})