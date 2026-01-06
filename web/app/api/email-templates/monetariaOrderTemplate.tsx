export function MonetariaOrderTemplate({
  nume,
  prenume,
  adresa,
  piesaCommandata,
  pret,
  telefon,
  email,
}: {
  nume: string;
  prenume: string;
  adresa: string;
  piesaCommandata: string;
  pret: string;
  telefon: string;
  email: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 15px; text-align: center; }
        .content { padding: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Comandă nouă de la eNumismatica.ro</h2>
        </div>
        <div class="content">
          <p>Bună ziua,</p>
          <p>O nouă comandă a fost plasată prin intermediul platformei eNumismatica.ro. Detaliile comenzii sunt următoarele:</p>

          <table>
            <tr>
              <th>Nume</th>
              <td>${nume}</td>
            </tr>
            <tr>
              <th>Prenume</th>
              <td>${prenume}</td>
            </tr>
            <tr>
              <th>Adresă</th>
              <td>${adresa}</td>
            </tr>
            <tr>
              <th>Piesă comandată</th>
              <td>${piesaCommandata}</td>
            </tr>
            <tr>
              <th>Preț</th>
              <td>${pret}</td>
            </tr>
            <tr>
              <th>Telefon</th>
              <td>${telefon}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>${email}</td>
            </tr>
          </table>

          <p>Vă rugăm să contactați clientul în cel mai scurt timp folosind datele de contact furnizate.</p>
          <p>eNumismatica.ro transmite exclusiv datele clientului către Monetăria Statului și nu este implicată direct în procesul de achiziție.</p>
        </div>
        <div class="footer">
          <p>Acest email a fost generat automat de platforma eNumismatica.ro</p>
        </div>
      </div>
    </body>
    </html>
  `;
}