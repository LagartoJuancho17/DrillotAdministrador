import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';
import Layout from '@/src/components/Layout';
import Auth from '@/src/pages/Auth';
import Dashboard from '@/src/pages/Dashboard';
import Orders from '@/src/pages/Orders';
import Clients from '@/src/pages/Clients';
import Marketing from '@/src/pages/Marketing';
import Purchases from '@/src/pages/Purchases';
import Shipping from '@/src/pages/Shipping';
import Inventory from '@/src/pages/Inventory';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = localStorage.getItem('frameflow_auth') === 'true';
      const username = localStorage.getItem('frameflow_user');
      
      if (isAuth && username) {
        setSession({
          user: {
            email: username,
            id: 'admin-id'
          }
        });
      } else {
        setSession(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('frameflow_auth');
    localStorage.removeItem('frameflow_user');
    setSession(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Cargando Drillot Admin...</p>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 mb-6">
              <SettingsIcon className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración Requerida</h1>
            <p className="text-slate-500 mt-4">
              Para comenzar a usar Drillot Admin, necesitas conectar tu proyecto de Supabase.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6 text-left">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Pasos a seguir:
              </h3>
              <ol className="list-decimal list-inside space-y-3 text-sm text-slate-600">
                <li>Crea un proyecto en <a href="https://supabase.com" target="_blank" className="text-violet-600 hover:underline">supabase.com</a></li>
                <li>Ve a <b>Settings &gt; API</b> y copia la URL y la Anon Key</li>
                <li>Añade las variables <b>VITE_SUPABASE_URL</b> y <b>VITE_SUPABASE_ANON_KEY</b> en el panel de Secretos de AI Studio</li>
                <li>Reinicia la aplicación</li>
              </ol>
            </div>
            
            <Button 
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => window.location.reload()}
            >
              Ya lo configuré, reintentar
            </Button>
          </div>
          
          <p className="text-xs text-slate-400">
            Consulta el archivo <b>supabase-setup.sql</b> para configurar tu base de datos.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="bg-red-50 border-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de Conexión</AlertTitle>
            <AlertDescription className="mt-2">
              {error}. Esto puede deberse a que las credenciales de Supabase son incorrectas o el servicio no está disponible.
              <Button 
                variant="outline" 
                className="w-full mt-4 border-red-200 text-red-800 hover:bg-red-100"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <Orders onManageShipping={(orderId) => {
          setSelectedOrderId(orderId);
          setActiveTab('shipping');
        }} />;
      case 'clients':
        return <Clients />;
      case 'purchases':
        return <Purchases />;
      case 'shipping':
        return <Shipping initialOrderId={selectedOrderId} onClearInitialOrder={() => setSelectedOrderId(null)} />;
      case 'marketing':
        return <Marketing />;
      case 'inventory':
        return <Inventory />;
      case 'settings':
        return (
          <div className="max-w-2xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Configuración</h2>
              <p className="text-slate-500">Ajustes generales del sistema y cuenta</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800">Conexión Supabase</h3>
                <p className="text-sm text-slate-500">Asegúrate de haber configurado las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800">Perfil de Usuario</h3>
                <p className="text-sm text-slate-600">Email: {session.user.email}</p>
                <p className="text-sm text-slate-600">ID: {session.user.id}</p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={session.user} 
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}
