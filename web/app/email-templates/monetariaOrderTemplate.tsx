export function MonetariaOrderTemplate(data: {
  nume: string;
  prenume: string;
  adresa: string;
  piesaCommandata: string;
  pret: string;
  telefon: string;
  email: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Comandă nouă de la eNumismatica.ro</h2>
      <p><strong>Nume:</strong> ${data.nume}</p>
      <p><strong>Prenume:</strong> ${data.prenume}</p>
      <p><strong>Adresă:</strong> ${data.adresa}</p>
      <p><strong>Piesă comandată:</strong> ${data.piesaCommandata}</p>
      <p><strong>Preț:</strong> ${data.pret}</p>
      <p><strong>Telefon:</strong> ${data.telefon}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p style="margin-top: 20px;">Aceasta este o comandă de la eNumismatica.ro către Monetăria Statului.</p>
    </div>
  `;
}