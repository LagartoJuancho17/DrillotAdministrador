import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { AdSpend } from '@/src/types';
import { 
  Plus, 
  TrendingUp, 
  Instagram, 
  BarChart3, 
  Calendar, 
  DollarSign,
  MousePointer2,
  Eye,
  ArrowUpRight,
  Search,
  Filter,
  X,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function Marketing() {
  const [adSpend, setAdSpend] = useState<AdSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [spendToDelete, setSpendToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [newSpend, setNewSpend] = useState({
    date: new Date().toISOString().split('T')[0],
    end_date: '',
    amount: '',
    type: 'Publicación' as 'Publicación' | 'Story'
  });

  useEffect(() => {
    fetchAdSpend();
  }, []);

  const fetchAdSpend = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_spend')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAdSpend(data || []);
    } catch (error) {
      console.error('Error fetching ad spend:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpend = async () => {
    if (!newSpend.amount || Number(newSpend.amount) <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    setSaving(true);
    try {
      console.log('Intentando guardar gasto:', {
        ...newSpend,
        amount: Number(newSpend.amount)
      });

      const { error } = await supabase
        .from('ad_spend')
        .insert([{
          date: newSpend.date,
          end_date: newSpend.end_date || null,
          platform: 'Instagram',
          type: newSpend.type,
          amount: Number(newSpend.amount),
          impressions: 0,
          clicks: 0
        }]);

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }
      
      console.log('Gasto guardado exitosamente');
      setIsDialogOpen(false);
      setNewSpend({
        date: new Date().toISOString().split('T')[0],
        end_date: '',
        amount: '',
        type: 'Publicación'
      });
      fetchAdSpend();
    } catch (error: any) {
      console.error('Error adding ad spend:', error);
      alert(`Error al registrar el gasto: ${error.message || 'Error desconocido'}. Asegúrate de haber ejecutado el SQL de configuración en Supabase.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSpendToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!spendToDelete) return;
    try {
      const { error } = await supabase.from('ad_spend').delete().eq('id', spendToDelete);
      if (error) throw error;
      fetchAdSpend();
    } catch (error) {
      console.error('Error deleting ad spend:', error);
      alert('Error al eliminar el registro de gasto.');
    } finally {
      setIsConfirmOpen(false);
      setSpendToDelete(null);
    }
  };

  const totalInvestment = adSpend.reduce((acc, curr) => acc + curr.amount, 0);

  const getStatus = (startDate: string, endDate: string | null) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    
    if (!endDate) {
      // Si no hay fecha de fin, asumimos que es solo por ese día
      return now.getTime() === start.getTime() ? 'active' : 'finished';
    }

    const end = new Date(endDate);
    if (now >= start && now <= end) return 'active';
    if (now < start) return 'pending';
    return 'finished';
  };

  const filteredAdSpend = adSpend.filter(item => {
    // Status Filter
    if (statusFilter !== 'all') {
      const status = getStatus(item.date, item.end_date || null);
      if (statusFilter === 'active' && status !== 'active') return false;
      if (statusFilter === 'finished' && status !== 'finished') return false;
    }

    // Search Filter (by type)
    if (searchTerm && !item.type.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Date Filter (matches start date)
    if (dateFilter && item.date !== dateFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing & Ads</h1>
          <p className="text-slate-500">Analiza el rendimiento de tu inversión publicitaria</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Gasto Publicitario</DialogTitle>
              <DialogDescription>Ingresa los datos de tu campaña de Instagram Ads.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Anuncio</Label>
                <Select 
                  value={newSpend.type} 
                  onValueChange={(val: any) => setNewSpend({...newSpend, type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Publicación">Publicación</SelectItem>
                    <SelectItem value="Story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Desde (Fecha)</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={newSpend.date}
                    onChange={(e) => setNewSpend({...newSpend, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Hasta (Fecha)</Label>
                  <Input 
                    id="end_date" 
                    type="date" 
                    value={newSpend.end_date}
                    onChange={(e) => setNewSpend({...newSpend, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Inversión ($)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="0.00" 
                  value={newSpend.amount}
                  onChange={(e) => setNewSpend({...newSpend, amount: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleAddSpend} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? 'Guardando...' : 'Guardar Gasto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Inversión Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${totalInvestment.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Total acumulado</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Campañas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {adSpend.filter(i => getStatus(i.date, i.end_date || null) === 'active').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">En curso actualmente</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por tipo (Publicación/Story)..." 
                  className="pl-10 bg-slate-50 border-slate-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative w-full md:w-48">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="date" 
                  className="pl-10 bg-slate-50 border-slate-200"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Estado:</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className={cn(statusFilter === 'all' ? "bg-slate-900" : "border-slate-200")}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={statusFilter === 'active' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                    className={cn(statusFilter === 'active' ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-200")}
                  >
                    En Curso
                  </Button>
                  <Button 
                    variant={statusFilter === 'finished' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('finished')}
                    className={cn(statusFilter === 'finished' ? "bg-slate-600 hover:bg-slate-700" : "border-slate-200")}
                  >
                    Finalizados
                  </Button>
                </div>
              </div>
              
              {(statusFilter !== 'all' || searchTerm || dateFilter) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                    setDateFilter('');
                  }}
                  className="text-slate-500"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Historial de Gastos</CardTitle>
          <CardDescription>Carga manual de datos de Meta Ads Manager</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Duración</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Inversión</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                      Cargando datos...
                    </TableCell>
                  </TableRow>
                ) : filteredAdSpend.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                      No hay gastos registrados con este filtro
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdSpend.map((item) => {
                    const status = getStatus(item.date, item.end_date || null);
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400">Desde: {item.date}</span>
                            {item.end_date && <span className="text-xs text-slate-400">Hasta: {item.end_date}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "px-2 py-0.5",
                            item.type === 'Story' ? "bg-pink-50 text-pink-700 border-pink-100" : "bg-blue-50 text-blue-700 border-blue-100"
                          )}>
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {status === 'active' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                              En Curso
                            </Badge>
                          ) : status === 'pending' ? (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                              Programado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                              Finalizado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          ${item.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteClick(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Deseas eliminar esto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de este gasto publicitario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
