'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface MonetariaStatuluiCheckoutFormProps {
  product: {
    product_id: string;
    title: string;
    price: string;
  };
  onSubmit: (formData: {
    name: string;
    surname: string;
    address: string;
    phone: string;
    email: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function MonetariaStatuluiCheckoutForm({ 
  product, 
  onSubmit, 
  onCancel 
}: MonetariaStatuluiCheckoutFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.displayName?.split(' ')[0] || '',
    surname: user?.displayName?.split(' ')[1] || '',
    address: '',
    phone: user?.phoneNumber || '',
    email: user?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Numele este obligatoriu';
    if (!formData.surname.trim()) newErrors.surname = 'Prenumele este obligatoriu';
    if (!formData.address.trim()) newErrors.address = 'Adresa este obligatorie';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefonul este obligatoriu';
    } else if (!/^\+?[0-9\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Telefon invalid';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Emailul este obligatoriu';
    } else if (!/^[^@]+@[^@]+\.[^@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit order:', error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-navy-900 border border-gold-500/20 rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">Comandă Monetaria Statului</h3>
        <p className="text-slate-300 mb-6">
          Completează formularul pentru a comanda {product.title} la prețul de {product.price}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Nume*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-xl border ${errors.name ? 'border-red-500' : 'border-gold-500/30'} bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
              required
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Prenume*</label>
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-xl border ${errors.surname ? 'border-red-500' : 'border-gold-500/30'} bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
              required
            />
            {errors.surname && <p className="text-red-500 text-xs mt-1">{errors.surname}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Adresă*</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 rounded-xl border ${errors.address ? 'border-red-500' : 'border-gold-500/30'} bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
              required
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Telefon*</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-gold-500/30'} bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
              required
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Email*</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gold-500/30'} bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
              required
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <p className="text-xs text-slate-400 mt-4">
            * Monetăria Statului va fi informată cu privire la intenția dumneavoastră de achiziție. 
            În cel mai scurt timp veți fi contactat prin datele furnizate în cererea de comandă (e-mail / telefon).
          </p>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-navy-800 hover:bg-navy-700 text-slate-200 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se trimite...' : 'Trimite comandă'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}