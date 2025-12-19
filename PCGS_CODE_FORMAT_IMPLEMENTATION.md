# Implementare Format Cod PCGS - Rezumat Complet

## Ce a fost schimbat

Am actualizat sistemul de validare a codurilor de certificare pentru a suporta atât formatul NGC cât și formatul PCGS în `web/app/products/new/page.tsx`.

## Formatele de cod acceptate

### NGC (Numismatic Guaranty Corporation)
- **Format**: `XXXXXXX-YYY` (7 cifre, liniuță, 3 cifre)
- **Exemplu**: `1234567-999`
- **Regex**: `/^\d{7}-\d{3}$/`

### PCGS (Professional Coin Grading Service)
- **Format**: `XXXXXX.XX/XXXXXXXX` (6 cifre, punct, 2 cifre, slash, 8 cifre)
- **Exemplu**: `123456.78/12345678`
- **Regex**: `/^\d{6}\.\d{2}\/\d{8}$/`

## Modificări în cod

### 1. Validarea codurilor de certificare (liniile 532-561)

**Înainte**:
```javascript
// Validate NGC code format (should be like "1234567-999")
const certCodeRegex = /^\d{7}-\d{3}$/;
if (!certCodeRegex.test(certificationCode.trim())) {
  showToast({
    type: 'error',
    title: 'Format cod NGC invalid',
    message: 'Codul de certificare trebuie să fie în formatul XXXXXXX-YYY (ex: 1234567-999).',
  });
  return;
}
```

**După**:
```javascript
// Validate certification code format based on company
let isValidCode = false;
if (certificationCompany === 'NGC') {
  // NGC format: XXXXXXX-YYY (7 digits - 3 digits)
  const ngcRegex = /^\d{7}-\d{3}$/;
  isValidCode = ngcRegex.test(certificationCode.trim());
} else if (certificationCompany === 'PCGS') {
  // PCGS format: XXXXXX.XX/XXXXXXXX (6 digits.2 digits/8 digits)
  const pcgsRegex = /^\d{6}\.\d{2}\/\d{8}$/;
  isValidCode = pcgsRegex.test(certificationCode.trim());
}

if (!isValidCode) {
  const formatExample = certificationCompany === 'NGC' ? '1234567-999' : '123456.78/12345678';
  showToast({
    type: 'error',
    title: 'Format cod certificare invalid',
    message: `Codul de certificare pentru ${certificationCompany} trebuie să fie în formatul ${formatExample}.`,
  });
  return;
}
```

### 2. Interfața utilizator - placeholder și text de ajutor (liniile 1096-1109)

**Înainte**:
```javascript
<input
  type="text"
  value={certificationCode}
  onChange={(e) => setCertificationCode(e.target.value)}
  placeholder="Ex: 1234567-999"
  className="w-full rounded-lg border border-blue-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
  required={hasCertification}
/>
<p className="text-xs text-slate-400 mt-1">
  Format: XXXXXXX-YYY (7 cifre - 3 cifre)
</p>
```

**După**:
```javascript
<input
  type="text"
  value={certificationCode}
  onChange={(e) => setCertificationCode(e.target.value)}
  placeholder={certificationCompany === 'NGC' ? 'Ex: 1234567-999' : 'Ex: 123456.78/12345678'}
  className="w-full rounded-lg border border-blue-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
  required={hasCertification}
/>
<p className="text-xs text-slate-400 mt-1">
  {certificationCompany === 'NGC' 
    ? 'Format: XXXXXXX-YYY (7 cifre - 3 cifre)'
    : 'Format: XXXXXX.XX/XXXXXXXX (6 cifre.2 cifre/8 cifre)'}
</p>
```

### 3. Mesaje de eroare actualizate

Am făcut mesajele de eroare mai generice pentru a se aplica la ambele companii:

- "Cod NGC lipsă" → "Cod certificare lipsă"
- "Grad NGC lipsă" → "Grad certificare lipsă"
- Mesajele de validare se personalizează în funcție de compania selectată

## Cum să testezi

### Testare format NGC
1. Accesează `/products/new`
2. Bifează "Am certificare profesională"
3. Selectează "NGC (Numismatic Guaranty Corporation)"
4. Încearcă să introduci:
   - ✅ `1234567-999` (valid)
   - ❌ `123456.78/12345678` (invalid pentru NGC)
   - ❌ `1234567` (invalid - lipsește liniuța și ultimele 3 cifre)

### Testare format PCGS
1. Accesează `/products/new`
2. Bifează "Am certificare profesională"
3. Selectează "PCGS (Professional Coin Grading Service)"
4. Încearcă să introduci:
   - ✅ `123456.78/12345678` (valid)
   - ❌ `1234567-999` (invalid pentru PCGS)
   - ❌ `123456/12345678` (invalid - lipsește punctul și cifrele după el)

### Testare dinamică a UI
1. Cu certificarea activată, schimbă între NGC și PCGS
2. Observă că placeholder-ul și textul de ajutor se actualizează automat

## Validarea la trimitere

Când utilizatorul apasă "Trimite spre aprobare", sistemul va valida:
1. Dacă codul nu este gol
2. Dacă formatul este corect pentru compania selectată
3. Dacă gradul de certificare este selectat

Dacă oricare dintre aceste validări eșuează, utilizatorul va primi un mesaj de eroare specific.

## Note tehnice

- Codul folosește regex Rust-compatibil (ca în restul proiectului)
- Formatele sunt validate înainte de salvarea în Firestore
- UI-ul se actualizează dinamic în funcție de compania selectată
- Toate mesajele de eroare sunt în română și specifice companiei

## Compatibilitate

Această modificare este:
- ✅ Backward compatible - produsele existente cu certificare NGC vor continua să funcționeze
- ✅ Forward compatible - permite adăugarea de noi companii în viitor
- ✅ User-friendly - oferă feedback clar și contextual