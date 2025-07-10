// app/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

// Import dari firebase
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';

// Import dari recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// Definisi Tipe Data
interface Sale {
  id: string;
  itemName: string;
  price: number;
  createdAt: any;
  saleDate: string;
}
interface WeeklySummary {
  date: string;
  total: number;
}

// Fungsi Helper
const getFormattedDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Komponen Utama
export default function DashboardPage() {
  // --- BAGIAN 1: Hooks dan State ---
  const { user, logout } = useAuth();
  const router = useRouter();

  const [weather, setWeather] = useState<any>(null);
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    getFormattedDate(new Date())
  );
  const [isEditing, setIsEditing] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklySummary[]>([]);

  // --- BAGIAN 2: useEffect untuk berbagai keperluan ---

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchWeather = async () => {
      // ## [PERBAIKAN] GANTI KUNCI DI BAWAH INI ##
      const API_KEY = 'e63fe637fc973e96c36e16c72de5580c'; // <-- GANTI DENGAN KUNCI DARI OPENWEATHERMAP
      const city = 'Tangerang';
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=id`
        );
        if (!response.ok) throw new Error('Gagal mengambil data cuaca. Pastikan API Key Anda benar dan sudah aktif.');
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error(error);
      }
    };
    if (user) {
        fetchWeather();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sales'),
      where('saleDate', '==', selectedDate),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(
        snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Sale))
      );
    });
    return () => unsubscribe();
  }, [selectedDate, user]);

  useEffect(() => {
    if (!user) return;
    const fetchWeeklyData = async () => {
      const dates = [];
      const summary: { [key: string]: number } = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - i);
        const formattedDate = getFormattedDate(date);
        dates.push(formattedDate);
        summary[formattedDate] = 0;
      }
      const q = query(collection(db, 'sales'), where('saleDate', 'in', dates));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const sale = doc.data() as Sale;
        if (summary[sale.saleDate] !== undefined) {
          summary[sale.saleDate] += sale.price;
        }
      });
      const chartData = Object.keys(summary).map((date) => ({
        date: `${new Date(date).getDate()}/${new Date(date).getMonth() + 1}`,
        total: summary[date],
      }));
      setWeeklyData(chartData);
    };
    fetchWeeklyData();
  }, [selectedDate, sales, user]);

  // --- BAGIAN 3: Fungsi-fungsi Handler ---

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPrice(value);
  };

  const handleEditClick = (sale: Sale) => {
    setIsEditing(true);
    setCurrentSale(sale);
    setItemName(sale.itemName);
    setPrice(String(sale.price));
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSale || price === '') return;
    const saleDocRef = doc(db, 'sales', currentSale.id);
    await updateDoc(saleDocRef, { itemName, price: Number(price) });
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentSale(null);
    setItemName('');
    setPrice('');
  };

  const addSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemName !== '' && price !== '') {
      await addDoc(collection(db, 'sales'), {
        itemName,
        price: Number(price),
        createdAt: serverTimestamp(),
        saleDate: selectedDate,
      });
      setItemName('');
      setPrice('');
    }
  };

  const deleteSale = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data penjualan ini?')) {
      await deleteDoc(doc(db, 'sales', id));
    }
  };

  // --- BAGIAN 4: Kalkulasi dan Persiapan Render ---

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const userName = user.email?.split('@')[0] || 'Karyawan';
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const totalSales = sales.reduce((sum, sale) => sum + sale.price, 0);
  const yAxisFormatter = (value: number) => value.toLocaleString('id-ID');
  const calculateYAxisTicks = () => {
    const maxYValue = Math.max(...weeklyData.map((d) => d.total), 0);
    const tickInterval = 5000;
    const ticks = [];
    if (maxYValue === 0) {
      for (let i = 0; i <= 25000; i += tickInterval) ticks.push(i);
      return ticks;
    }
    for (let i = 0; i <= maxYValue + tickInterval; i += tickInterval)
      ticks.push(i);
    return ticks;
  };
  const yAxisTicks = calculateYAxisTicks();

  // --- BAGIAN 5: Tampilan JSX ---
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-100">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-md">
          <div>
            <h1 className="text-2xl font-bold capitalize">Halo, {userName}!</h1>
            <p className="text-gray-500">{today}</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {weather && (
              <div className="flex items-center text-right">
                <div>
                  <p className="font-semibold text-lg">
                    {Math.round(weather.main.temp)}°C
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {weather.weather[0].description}
                  </p>
                </div>
                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`}
                  alt="weather icon"
                />
              </div>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
            <div className="lg:col-span-2 bg-blue-500 text-white p-6 rounded-lg shadow-lg flex flex-col justify-center text-center h-full">
                <h2 className="text-2xl">Total Penjualan untuk {selectedDate}</h2>
                <p className="text-5xl font-bold mt-2">Rp {totalSales.toLocaleString('id-ID')}</p>
            </div>
            <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-center">Grafik Penjualan 7 Hari Terakhir</h3>
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={yAxisFormatter} ticks={yAxisTicks} domain={[0, yAxisTicks[yAxisTicks.length - 1]]} />
                    <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                    <Legend />
                    <Bar dataKey="total" name="Total Penjualan" fill="#8884d8" />
                </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">{isEditing ? 'Ubah Data Penjualan' : 'Tambah Penjualan Baru'}</h2>
            <form onSubmit={isEditing ? handleUpdateSale : addSale}>
                <p className="block text-gray-700 mb-4">Tanggal Penjualan: <span className="font-bold">{isEditing ? currentSale?.saleDate : selectedDate}</span></p>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2" htmlFor="itemName">Nama Barang</label>
                  <input id="itemName" type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2" htmlFor="price">Harga</label>
                  <input id="price" type="text" inputMode="numeric" value={price} onChange={handlePriceChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Contoh: 20000" required />
                  {price && (<p className="text-sm text-gray-500 mt-1">Akan disimpan sebagai: <span className="font-semibold">Rp {Number(price).toLocaleString('id-ID')}</span></p>)}
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">{isEditing ? 'Simpan Perubahan' : 'Simpan'}</button>
                  {isEditing && (<button type="button" onClick={handleCancelEdit} className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>)}
                </div>
            </form>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Riwayat Penjualan ({selectedDate})</h2>
              {sales.length > 0 ? (
                <ul className="space-y-3 h-96 overflow-y-auto">
                  {sales.map((sale) => (
                    <li key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                          <p className="font-medium">{sale.itemName}</p>
                          <p className="text-sm text-green-600 font-semibold">Rp {sale.price.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handleEditClick(sale)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg text-sm">Ubah</button>
                          <button onClick={() => deleteSale(sale.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-sm">Hapus</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500"><p>Tidak ada penjualan pada tanggal ini.</p></div>
              )}
          </div>
        </div>
      </div>
    </main>
  );
}
