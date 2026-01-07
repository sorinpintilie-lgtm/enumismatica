'use client'

import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useProduct } from '../hooks/useProducts'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../hooks/useCart'
import { formatRON } from '../../shared/utils/currency'
import { createDirectOrderForProduct } from '../../shared/orderService'
import { createOrGetConversation } from '../../shared/chatService'
import { logEvent } from '../hooks/useActivityLogger'
import OfferModal from '../components/OfferModal'
import OfferManagement from '../components/OfferManagement'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../shared/firebaseConfig'

// Helper to safely format numeric/string values with units
function formatWithUnit(value: string | number | null | undefined, unit: string): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'number') {
    return `${value} ${unit}`
  }

  const trimmed = String(value).trim()
  const lower = trimmed.toLowerCase()

  // If the value already ends with the unit, don't append it again
  if (lower.endsWith(unit.toLowerCase())) {
    return trimmed
  }

  return `${trimmed} ${unit}`
}

// Ensure product images get a width parameter without breaking existing query strings
function buildImageUrlWithWidth(url: string | undefined, width: number): string {
  if (!url) return ''
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}width=${width}`
}

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams()
  const id = params.id as string
  const router = useRouter()
  const { product, loading, error } = useProduct(id)
  const { user } = useAuth()
  const { addToCart } = useCart(user?.uid)

  const [heroIndex, setHeroIndex] = useState(0)
  const [buying, setBuying] = useState(false)
  const [showBuyConfirm, setShowBuyConfirm] = useState(false)
  const [viewMode, setViewMode] = useState<'owner' | 'preview'>('preview')
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showOfferManagement, setShowOfferManagement] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)

  const images = product?.images ?? []
  const isOwner = user && product && user.uid === product.ownerId

  // Seller information state
  const [sellerName, setSellerName] = useState<string | null>(null)
  const [sellerVerified, setSellerVerified] = useState(false)
  const [sellerUsername, setSellerUsername] = useState<string | null>(null)

  // Set default view mode for owners
  useEffect(() => {
    if (isOwner && viewMode === 'preview') {
      setViewMode('owner')
    }
  }, [isOwner, viewMode])

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { isAdmin } = require('shared/adminService')
        const adminStatus = await isAdmin(user.uid)
        setIsAdminUser(adminStatus)
      }
    }
    checkAdmin()
  }, [user])

  // Fetch seller information
  useEffect(() => {
    let cancelled = false
    const loadSeller = async () => {
      if (!db || !product?.ownerId) return
      try {
        const snap = await getDoc(doc(db, 'users', product.ownerId))
        if (!snap.exists()) return
        const data = snap.data() as any
        if (cancelled) return
        setSellerName(data.displayName || data.name || data.email || `Vânzător #${product.ownerId.slice(-6)}`)
        setSellerUsername(data.username || data.displayName || data.name || `utilizator${product.ownerId.slice(-4)}`)
        setSellerVerified(data.idVerificationStatus === 'verified')
      } catch (err) {
        console.error('Failed to load seller', err)
      }
    }

    setSellerName(null)
    setSellerUsername(null)
    setSellerVerified(false)
    loadSeller()
    return () => {
      cancelled = true
    }
  }, [product?.ownerId])

  useEffect(() => {
    // Reset hero image when navigating to a different product
    setHeroIndex(0)
  }, [id])

  const handleBuyClick = () => {
    if (!product) return

    if (!user) {
      Alert.alert('Autentificare necesară', 'Trebuie să te autentifici pentru a cumpăra această piesă.')
      return
    }

    if (product.ownerId === user.uid) {
      Alert.alert('Nu poți cumpăra propria piesă', 'Ești deja proprietarul acestei piese.')
      return
    }

    if ((product as any).isSold) {
      Alert.alert('Piesă indisponibilă', 'Această piesă a fost deja vândută.')
      return
    }

    setShowBuyConfirm(true)
  }

  const handleBuy = async () => {
    if (!product || !user) return

    try {
      setBuying(true)
      const orderId = await createDirectOrderForProduct(product.id, user.uid)

      // Admin activity log: direct shop purchase from product detail page
      await logEvent(user, 'product_buy', {
        productId: product.id,
        productName: product.name,
        price: product.price,
        orderId,
        source: 'product_detail',
      })

      // Ensure a private conversation exists between buyer and seller and redirect to it
      if (product.ownerId && product.ownerId !== user.uid) {
        try {
          const conversationId = await createOrGetConversation(
            user.uid,
            product.ownerId,
            undefined,
            product.id,
            false,
          )
          router.push(`/messages?conversation=${conversationId}`)
        } catch (convError) {
          console.error('Failed to open conversation after direct product purchase:', convError)
        }
      }

      Alert.alert('Cumpărare reușită', `Ai cumpărat această piesă. Comanda ta a fost înregistrată (ID: ${orderId}).`)
    } catch (error) {
      console.error('Failed to buy product:', error)
      const message = error instanceof Error ? error.message : 'A apărut o eroare la cumpărarea piesei.'
      Alert.alert('Eroare la cumpărare', message)
    } finally {
      setBuying(false)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return

    if (!user) {
      Alert.alert('Autentificare necesară', 'Trebuie să te autentifici pentru a adăuga piese în coș.')
      return
    }

    try {
      await addToCart(product.id)
      Alert.alert('Adăugat în coș', `${product.name} a fost adăugat în coșul tău.`)
    } catch (error) {
      console.error('Failed to add to cart:', error)
      const message = error instanceof Error ? error.message : 'A apărut o eroare la adăugarea piesei în coș.'
      Alert.alert('Eroare la coș', message)
    }
  }

  const handleMakeOffer = () => {
    if (!user) {
      Alert.alert('Autentificare necesară', 'Trebuie să te autentifici pentru a face o ofertă.')
      return
    }
    if (!product) return;
    
    if (product.ownerId === user.uid) {
      Alert.alert('Nu poți face ofertă pe propria piesă', 'Ești deja proprietarul acestei piese.')
      return
    }
    if (product.isSold) {
      Alert.alert('Piesă indisponibilă', 'Această piesă a fost deja vândută.')
      return
    }
    if (product.acceptsOffers === false) {
      Alert.alert('Oferțele nu sunt acceptate', 'Vânzătorul nu acceptă oferte pentru această piesă.')
      return
    }
    setShowOfferModal(true)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e7b73c" />
      </View>
    )
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{error ? 'Eroare la încărcarea piesei' : 'Piesă negăsită'}</Text>
        <Text style={styles.errorMessage}>{error || 'Piesa pe care o cauți nu există.'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonTextStyle}>Înapoi la piese</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButtonContainer}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Înapoi la piese</Text>
      </TouchableOpacity>

      {/* View mode toggle for owners */}
      {isOwner && (
        <View style={styles.viewModeContainer}>
          <Text style={styles.viewModeLabel}>Vizualizare:</Text>
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'preview' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('preview')}
            >
              <Text style={[styles.viewModeButtonText, viewMode === 'preview' && styles.viewModeButtonTextActive]}>
                Preview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'owner' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('owner')}
            >
              <Text style={[styles.viewModeButtonText, viewMode === 'owner' && styles.viewModeButtonTextActive]}>
                Proprietar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Admin edit button */}
      {isAdminUser && (
        <TouchableOpacity
          style={styles.adminEditButton}
          onPress={() => {
            const editUrl = `/products/new?edit=${product.id}`
            router.push(editUrl)
          }}
        >
          <Text style={styles.adminEditButtonText}>Modifică Piesă</Text>
        </TouchableOpacity>
      )}

      {/* Product Images */}
      <View style={styles.imageContainer}>
        {images.length > 0 ? (
          <TouchableOpacity onPress={() => {}}>
            <Image
              source={{ uri: buildImageUrlWithWidth(images[heroIndex] || images[0], 800) }}
              style={styles.mainImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>Imagine indisponibilă</Text>
          </View>
        )}

        {images.length > 1 && (
          <View style={styles.thumbnailContainer}>
            {images.slice(1).map((image, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.thumbnail, heroIndex === index + 1 && styles.thumbnailActive]}
                onPress={() => setHeroIndex(index + 1)}
              >
                <Image
                  source={{ uri: buildImageUrlWithWidth(image, 200) }}
                  style={styles.thumbnailImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Product Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productDate}>Adăugat în {product.createdAt.toLocaleDateString()}</Text>

        {product.ownerId && (
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerLabel}>Vânzător:</Text>
            <Text style={styles.sellerUsername}>@{sellerUsername}</Text>
            {sellerVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>VERIFICAT</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.productPrice}>{formatRON(product.price)}</Text>
        <Text style={styles.priceNote}>Prețul este afișat în EUR.</Text>

        {product.isSold && (
          <Text style={styles.soldText}>Această piesă a fost vândută și nu mai este disponibilă.</Text>
        )}

        {/* Action Buttons */}
        {viewMode === 'preview' ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.addToCartButton]}
              onPress={handleAddToCart}
              disabled={product.isSold === true || (!!user && product.ownerId === user.uid)}
            >
              <Text style={styles.actionButtonText}>
                {product.isSold
                  ? 'Deja vândut'
                  : !!user && product.ownerId === user.uid
                  ? 'Ești proprietarul acestei piese'
                  : 'Adaugă în coș'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.buyButton]}
              onPress={handleBuyClick}
              disabled={buying || product.isSold === true || (!!user && product.ownerId === user.uid)}
            >
              <Text style={styles.actionButtonText}>
                {product.isSold
                  ? 'Deja vândut'
                  : !!user && product.ownerId === user.uid
                  ? 'Ești proprietarul acestei piese'
                  : buying
                  ? 'Se procesează cumpărarea...'
                  : 'Cumpără acum'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.offerButton]}
              onPress={handleMakeOffer}
              disabled={product.isSold === true || (!!user && product.ownerId === user.uid) || product.acceptsOffers === false}
            >
              <Text style={styles.actionButtonText}>
                {product.isSold
                  ? 'Deja vândut'
                  : !!user && product.ownerId === user.uid
                  ? 'Ești proprietarul acestei piese'
                  : product.acceptsOffers === false
                  ? 'Oferțele nu sunt acceptate'
                  : 'Transmite o ofertă'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ownerMode}>
            <Text style={styles.ownerModeText}>Mod Proprietar: Gestionați-vă piesa și vizualizați ofertele primite.</Text>
            <View style={styles.ownerButtons}>
              <TouchableOpacity
                style={[styles.ownerButton, styles.editButton]}
                onPress={() => router.push(`/products/new?edit=${product.id}`)}
              >
                <Text style={styles.ownerButtonText}>Editează Piesă</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ownerButton, styles.manageOffersButton]}
                onPress={() => setShowOfferManagement(true)}
              >
                <Text style={styles.ownerButtonText}>Gestionare Oferte</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Product Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descriere</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>

        {/* Coin Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalii monedă</Text>

          <View style={styles.detailsGrid}>
            {/* Basic Information */}
            <View style={styles.detailsColumn}>
              <Text style={styles.detailsSubtitle}>Informații generale</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ID piesă:</Text>
                <Text style={styles.detailValue}>{product.id}</Text>
              </View>
              {product.country && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Țară:</Text>
                  <Text style={styles.detailValue}>{product.country}</Text>
                </View>
              )}
              {product.year && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>An:</Text>
                  <Text style={styles.detailValue}>{product.year}</Text>
                </View>
              )}
              {product.era && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Epocă:</Text>
                  <Text style={styles.detailValue}>{product.era}</Text>
                </View>
              )}
              {product.denomination && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Valoare nominală:</Text>
                  <Text style={styles.detailValue}>{product.denomination}</Text>
                </View>
              )}
              {product.category && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Categorie:</Text>
                  <Text style={styles.detailValue}>{product.category}</Text>
                </View>
              )}
            </View>

            {/* Physical Properties */}
            <View style={styles.detailsColumn}>
              <Text style={styles.detailsSubtitle}>Proprietăți fizice</Text>
              {product.metal && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Metal:</Text>
                  <Text style={styles.detailValue}>{product.metal}</Text>
                </View>
              )}
              {product.weight && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Greutate:</Text>
                  <Text style={styles.detailValue}>{formatWithUnit(product.weight as any, 'g')}</Text>
                </View>
              )}
              {product.diameter && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Diametru:</Text>
                  <Text style={styles.detailValue}>{formatWithUnit(product.diameter as any, 'mm')}</Text>
                </View>
              )}
              {product.grade && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grad:</Text>
                  <Text style={styles.detailValue}>{product.grade}</Text>
                </View>
              )}
              {product.mintMark && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Marcă monetărie:</Text>
                  <Text style={styles.detailValue}>{product.mintMark}</Text>
                </View>
              )}
              {product.rarity && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Raritate:</Text>
                  <View style={[styles.rarityBadge, 
                    product.rarity === 'extremely-rare' ? styles.rarityExtreme :
                    product.rarity === 'very-rare' ? styles.rarityVeryRare :
                    product.rarity === 'rare' ? styles.rarityRare :
                    product.rarity === 'uncommon' ? styles.rarityUncommon :
                    styles.rarityCommon
                  ]}>
                    <Text style={styles.rarityBadgeText}>{product.rarity.replace('-', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Certification Section */}
          {(product.hasCertification || product.hasNgcCertification || product.certificationCompany || product.ngcCode) && (
            <View style={styles.certificationSection}>
              <Text style={styles.detailsSubtitle}>Certificare</Text>
              {product.certificationCompany && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Companie certificare:</Text>
                  <Text style={styles.detailValue}>
                    {product.certificationCompany === 'NGC' ? 'Numismatic Guaranty Corporation' : 'Professional Coin Grading Service'}
                  </Text>
                </View>
              )}
              {product.certificationCode && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cod certificare:</Text>
                  <Text style={styles.detailValue}>{product.certificationCode}</Text>
                </View>
              )}
              {product.ngcCode && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cod NGC:</Text>
                  <Text style={styles.detailValue}>{product.ngcCode}</Text>
                </View>
              )}
              {product.certificationGrade && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grad certificare:</Text>
                  <Text style={styles.detailValue}>{product.certificationGrade}</Text>
                </View>
              )}
              {product.ngcGrade && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grad NGC:</Text>
                  <Text style={styles.detailValue}>{product.ngcGrade}</Text>
                </View>
              )}

              {/* Certification Verification Links */}
              <View style={styles.certificationLinks}>
                {product.certificationCompany === 'NGC' && product.certificationCode && (
                  <TouchableOpacity
                    style={styles.certificationLink}
                    onPress={() => Linking.openURL(`https://www.ngccoin.com/certlookup/${product.certificationCode}/`)}
                  >
                    <Text style={styles.certificationLinkText}>NGC Verificare</Text>
                  </TouchableOpacity>
                )}
                {product.certificationCompany === 'PCGS' && product.certificationCode && (
                  <TouchableOpacity
                    style={[styles.certificationLink, styles.pcgsLink]}
                    onPress={() => Linking.openURL(`https://www.pcgs.com/cert/${product.certificationCode}`)}
                  >
                    <Text style={styles.certificationLinkText}>PCGS Verificare</Text>
                  </TouchableOpacity>
                )}
                {product.ngcCode && (
                  <TouchableOpacity
                    style={styles.certificationLink}
                    onPress={() => Linking.openURL(`https://www.ngccoin.com/certlookup/${product.ngcCode}/`)}
                  >
                    <Text style={styles.certificationLinkText}>NGC Verificare</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Listing Information */}
          <View style={styles.listingInfoSection}>
            <Text style={styles.detailsSubtitle}>Informații listare</Text>
            <View style={styles.listingDetails}>
              <View style={styles.listingDetailRow}>
                <Text style={styles.listingDetailLabel}>Listat:</Text>
                <Text style={styles.listingDetailValue}>{product.createdAt.toLocaleDateString()}</Text>
              </View>
              <View style={styles.listingDetailRow}>
                <Text style={styles.listingDetailLabel}>Ultima actualizare:</Text>
                <Text style={styles.listingDetailValue}>{product.updatedAt.toLocaleDateString()}</Text>
              </View>
              {product.listingExpiresAt && (
                <View style={styles.listingDetailRow}>
                  <Text style={styles.listingDetailLabel}>Expiră listarea:</Text>
                  <Text style={styles.listingDetailValue}>{product.listingExpiresAt.toLocaleDateString()}</Text>
                </View>
              )}
              {product.boostExpiresAt && (
                <View style={styles.listingDetailRow}>
                  <Text style={styles.listingDetailLabel}>Promovat până la:</Text>
                  <Text style={[styles.listingDetailValue, styles.promotedText]}>
                    {product.boostExpiresAt instanceof Date
                      ? product.boostExpiresAt.toLocaleDateString()
                      : new Date(product.boostExpiresAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {product.promotionExpiresAt && (
                <View style={styles.listingDetailRow}>
                  <Text style={styles.listingDetailLabel}>Promoție până la:</Text>
                  <Text style={[styles.listingDetailValue, styles.promotedText]}>
                    {product.promotionExpiresAt instanceof Date
                      ? product.promotionExpiresAt.toLocaleDateString()
                      : new Date(product.promotionExpiresAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Buy Confirmation Modal */}
        {showBuyConfirm && product && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Confirmă cumpărarea piesei</Text>
              <Text style={styles.modalMessage}>
                Ești sigur că vrei să cumperi această piesă pentru {' '}
                <Text style={styles.modalPrice}>{formatRON(product.price)}</Text>?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowBuyConfirm(false)}
                  disabled={buying}
                >
                  <Text style={styles.modalButtonText}>Nu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={async () => {
                    await handleBuy()
                    setShowBuyConfirm(false)
                  }}
                  disabled={buying}
                >
                  <Text style={styles.modalButtonText}>{buying ? 'Se procesează...' : 'Da, cumpără acum'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Offer Modal */}
        <OfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          itemType="product"
          itemId={product.id}
          itemName={product.name}
          currentPrice={product.price}
          buyerId={user?.uid || ''}
        />

        {/* Offer Management Modal */}
        {showOfferManagement && (
          <OfferManagement
            productId={product.id}
            productName={product.name}
            onClose={() => setShowOfferManagement(false)}
          />
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a192f',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0a192f',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#e7b73c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  backButtonText: {
    color: '#000940',
    fontWeight: '600',
    fontSize: 16,
  },
  backButtonContainer: {
    marginBottom: 16,
  },
  backButtonTextStyle: {
    color: '#e7b73c',
    fontWeight: '500',
    fontSize: 16,
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewModeLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginRight: 8,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(231, 183, 60, 0.3)',
    padding: 4,
  },
  viewModeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#e7b73c',
  },
  viewModeButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  viewModeButtonTextActive: {
    color: '#000940',
  },
  adminEditButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  adminEditButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  imageContainer: {
    marginBottom: 24,
  },
  mainImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 183, 60, 0.2)',
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 183, 60, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 183, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailActive: {
    borderColor: 'rgba(231, 183, 60, 0.8)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  detailsContainer: {
    paddingBottom: 24,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  productDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 4,
  },
  sellerUsername: {
    fontSize: 14,
    color: '#e7b73c',
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.6)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(34, 197, 94, 0.8)',
    textTransform: 'uppercase',
  },
  productPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e7b73c',
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  soldText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(231, 183, 60, 0.6)',
  },
  buyButton: {
    backgroundColor: '#e7b73c',
  },
  offerButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  ownerMode: {
    marginBottom: 24,
  },
  ownerModeText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  ownerButtons: {
    gap: 12,
  },
  ownerButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#2563eb',
  },
  manageOffersButton: {
    backgroundColor: '#10b981',
  },
  ownerButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  detailsGrid: {
    gap: 16,
  },
  detailsColumn: {
    flex: 1,
  },
  detailsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e7b73c',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 14,
    color: '#e2e8f0',
  },
  rarityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rarityExtreme: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
  },
  rarityVeryRare: {
    backgroundColor: 'rgba(245, 158, 11, 0.6)',
  },
  rarityRare: {
    backgroundColor: 'rgba(245, 158, 11, 0.6)',
  },
  rarityUncommon: {
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
  },
  rarityCommon: {
    backgroundColor: 'rgba(107, 114, 128, 0.6)',
  },
  certificationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 183, 60, 0.2)',
  },
  certificationLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  certificationLink: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pcgsLink: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  certificationLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  listingInfoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 183, 60, 0.2)',
  },
  listingDetails: {
    gap: 8,
  },
  listingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listingDetailLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  listingDetailValue: {
    fontSize: 14,
    color: '#e2e8f0',
  },
  promotedText: {
    color: '#10b981',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(231, 183, 60, 0.4)',
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalPrice: {
    fontWeight: '600',
    color: '#e7b73c',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
  },
  modalConfirmButton: {
    backgroundColor: '#e7b73c',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
})
