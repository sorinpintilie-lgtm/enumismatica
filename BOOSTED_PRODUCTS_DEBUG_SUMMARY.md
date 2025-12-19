# Boosted Products Debugging - Issue Resolution Plan

## Problem Description
The homepage "produse promovate" (promoted products) section is not showing any products, even though there should be boosted products in the database.

## Investigation & Debugging Tools Added

### 1. Enhanced Debug Logging in `useBoostedProducts` Hook
**File**: `web/app/hooks/useCachedProducts.ts`

Added comprehensive console logging to track:
- Current timestamp being used for boost expiration check
- Firestore query execution
- Number of documents found
- Details of each boosted product discovered
- Final count of boosted products returned

**Console Output to Look For**:
```
🔍 Debug: Checking for boosted products at [ISO_TIMESTAMP]
🔍 Debug: Executing Firestore query for boosted products
🔍 Debug: Query completed, documents found: [NUMBER]
🔍 Debug: Found boosted product: [PRODUCT_ID] {details}
🔍 Debug: Final boosted products count: [NUMBER]
```

### 2. Admin Test Boost Page
**File**: `web/app/admin/test-boost/page.tsx`

Created a dedicated admin page to:
- View all approved products in the database
- Manually boost any product for testing (1-30 days)
- Real-time testing of the boosting functionality

**Access**: `/admin/test-boost` (admin only)

## Possible Causes & Solutions

### 1. **No Products Have Active Boosts**
**Symptom**: Console shows "documents found: 0"

**Solution**: Use the test boost page to manually boost some products for testing

### 2. **Boost Expiration Dates Are in the Past**
**Symptom**: Products exist but query filters them out

**Investigation**: Check console logs for product details and `boostExpiresAt` dates

**Solution**: Re-boost expired products using the test page

### 3. **Firestore Query Issues**
**Symptom**: Unexpected query behavior

**Investigation**: The query uses:
```javascript
where('status', '==', 'approved')
where('boostExpiresAt', '>', now)
orderBy('boostExpiresAt', 'desc')
orderBy('boostedAt', 'desc')
```

**Note**: Firestore requires the first `orderBy` to match the inequality field used in `where`

### 4. **Products Not Approved**
**Symptom**: Products exist but have `status !== 'approved'`

**Solution**: Approve products in admin panel (`/admin/products`)

### 5. **Date/Time Issues**
**Symptom**: Timezone or date parsing problems

**Investigation**: Check if `boostExpiresAt` is stored as Firestore Timestamp vs Date

## Testing Steps

### Step 1: Check Console Logs
1. Open homepage in browser
2. Open Developer Tools → Console
3. Look for debug messages from `useBoostedProducts`
4. Note the number of documents found

### Step 2: Access Test Boost Page
1. Go to `/admin/test-boost`
2. Select an approved product
3. Choose boost duration (7 days recommended)
4. Click "Boost Product"

### Step 3: Verify Homepage
1. Return to homepage
2. Check if boosted products now appear in "produse promovate" section
3. Look for console logs showing found products

### Step 4: Check Multiple Products
1. Boost 2-3 different products
2. Verify all appear on homepage
3. Test the ordering (should be by `boostExpiresAt` desc, then `boostedAt` desc)

## Database Fields Required for Boosting

For a product to appear in boosted products, it needs:
```javascript
{
  status: "approved",
  boostExpiresAt: Timestamp > now,  // Active boost
  boostedAt: Timestamp,              // When boost was applied
  name: "Product Name",
  images: ["image_url"],
  price: 100
}
```

## Admin Functions Reference

### Manual Boost (via test page)
- **Cost**: None (for testing)
- **Duration**: Configurable (1-30 days)
- **Effect**: Product appears in homepage "produse promovate"

### Production Boost (via credit system)
- **Function**: `boostProductWithCredits()` in `shared/creditService.ts`
- **Cost**: 5 credits
- **Duration**: 7 days default
- **User Action**: Available in product management interface

## Expected Behavior After Fix

1. **Homepage displays up to 3 boosted products** in the hero section
2. **Products show with "Produs Promovat" badge**
3. **Images and pricing display correctly**
4. **Additional products show in small preview cards** (if more than 1 boosted)

## Monitoring & Validation

- **Console logs** confirm query execution and results
- **Test page** allows real-time validation
- **Homepage behavior** should show promoted products immediately after boosting

## Next Steps

1. **Deploy changes** and test on staging/production
2. **Run test sequence** above to identify root cause
3. **Create boosted products** using test page if none exist
4. **Verify homepage functionality** works as expected
5. **Remove debug logging** once issue is resolved
6. **Clean up test page** or keep for future admin use

## Files Modified

- `web/app/hooks/useCachedProducts.ts` - Added debug logging
- `web/app/admin/test-boost/page.tsx` - New test interface (to be cleaned up later)

## Git Commit
```
commit be45ab0
Author: [Your Name]
Date: [Current Date]

debug: add debugging and test tools for boosted products issue

- Add console logging to useBoostedProducts hook for debugging
- Create admin test-boost page to manually boost products for testing
- Help identify why 'produse promovate' section shows no products