import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { getOffersForItem, acceptOffer, rejectOffer } from '../../shared/offerService'
import { Offer } from '../../shared/types'

type OfferManagementProps = {
  productId: string
  productName: string
  onClose: () => void
}

export default function OfferManagement({ productId, productName, onClose }: OfferManagementProps) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true)
        setError(null)
        const offersData = await getOffersForItem('product', productId)
        setOffers(offersData)
      } catch (err) {
        console.error('Failed to load offers:', err)
        setError('Failed to load offers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadOffers()
  }, [productId])

  const handleAcceptOffer = async (offerId: string) => {
    try {
      setProcessing(offerId)
      await acceptOffer(offerId)
      // Refresh offers after accepting
      const updatedOffers = await getOffersForItem('product', productId)
      setOffers(updatedOffers)
      Alert.alert('Offer Accepted', 'The offer has been accepted successfully!')
    } catch (err) {
      console.error('Failed to accept offer:', err)
      Alert.alert('Error', 'Failed to accept offer. Please try again.')
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectOffer = async (offerId: string) => {
    try {
      setProcessing(offerId)
      await rejectOffer(offerId)
      // Refresh offers after rejecting
      const updatedOffers = await getOffersForItem('product', productId)
      setOffers(updatedOffers)
      Alert.alert('Offer Rejected', 'The offer has been rejected.')
    } catch (err) {
      console.error('Failed to reject offer:', err)
      Alert.alert('Error', 'Failed to reject offer. Please try again.')
    } finally {
      setProcessing(null)
    }
  }

  const getOfferStatusColor = (status: Offer['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b' // amber
      case 'accepted': return '#10b981' // green
      case 'rejected': return '#ef4444' // red
      case 'expired': return '#6b7280' // gray
      default: return '#94a3b8' // neutral
    }
  }

  return (
    <Modal 
      visible={true} 
      animationType="slide" 
      transparent={true} 
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Manage Offers for {productName}</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#e7b73c" />
              <Text style={styles.loadingText}>Loading offers...</Text>
            </View>
          ) : offers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No offers found for this product.</Text>
            </View>
          ) : (
            <ScrollView style={styles.offersList}>
              {offers.map((offer) => (
                <View key={offer.id} style={styles.offerItem}>
                  <View style={styles.offerHeader}>
                    <Text style={styles.offerId}>Offer #{offer.id.slice(-6)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getOfferStatusColor(offer.status) }]}>
                      <Text style={styles.statusText}>{offer.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.offerAmount}>€{offer.offerAmount?.toFixed(2) || 'N/A'}</Text>
                  <Text style={styles.offerBuyer}>From: {offer.buyerId.slice(-8)}</Text>

                  {offer.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectOffer(offer.id)}
                        disabled={processing === offer.id}
                      >
                        <Text style={styles.actionButtonText}>
                          {processing === offer.id ? 'Processing...' : 'Reject'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleAcceptOffer(offer.id)}
                        disabled={processing === offer.id}
                      >
                        <Text style={styles.actionButtonText}>
                          {processing === offer.id ? 'Processing...' : 'Accept'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {offer.status === 'accepted' && (
                    <Text style={styles.acceptedText}>This offer has been accepted</Text>
                  )}

                  {offer.status === 'rejected' && (
                    <Text style={styles.rejectedText}>This offer has been rejected</Text>
                  )}

                  {offer.status === 'expired' && (
                    <Text style={styles.expiredText}>This offer has expired</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    maxWidth: 600,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center'
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center'
  },
  offersList: {
    maxHeight: 400
  },
  offerItem: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  offerId: {
    color: '#94a3b8',
    fontSize: 14
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  offerAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e7b73c',
    marginBottom: 4
  },
  offerBuyer: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rejectButton: {
    backgroundColor: '#dc2626',
    borderWidth: 1,
    borderColor: '#ef4444'
  },
  acceptButton: {
    backgroundColor: '#10b981'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  acceptedText: {
    color: '#10b981',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600'
  },
  rejectedText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600'
  },
  expiredText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600'
  },
  closeButton: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  }
})