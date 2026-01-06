import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MonetariaCheckoutForm({ product }: { product: any }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nume: '',
    prenume: '',
    adresa: '',
    telefon: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/monetaria-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          piesaCommandata: product.title,
          pret: product.price,
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la trimitea comenzii');
      }

      setSuccess(true);
      // Reset form after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        router.push('/');
      }, 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare necunoscută');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Comandă trimisă!</strong>
        <span className="block sm:inline"> Monetăria Statului a fost informată cu privire la intenția dumneavoastră de achiziție. În cel mai scurt timp veți fi contactat prin datele furnizate în cererea de comandă (e-mail / telefon).</span>
        <span className="block sm:inline mt-2">eNumismatica.ro transmite exclusiv datele dumneavoastră către Monetăria Statului și nu este implicată direct în procesul de achiziție.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Completare date pentru comandă</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="nume" className="block text-sm font-medium text-gray-700">Nume</label>
        <input
          type="text"
          id="nume"
          name="nume"
          value={formData.nume}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="prenume" className="block text-sm font-medium text-gray-700">Prenume</label>
        <input
          type="text"
          id="prenume"
          name="prenume"
          value={formData.prenume}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="adresa" className="block text-sm font-medium text-gray-700">Adresă</label>
        <input
          type="text"
          id="adresa"
          name="adresa"
          value={formData.adresa}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="telefon" className="block text-sm font-medium text-gray-700">Telefon</label>
        <input
          type="tel"
          id="telefon"
          name="telefon"
          value={formData.telefon}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
      >
        {isSubmitting ? 'Se trimite...' : 'Trimite comandă'}
      </button>
    </form>
  );
}