import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Supply, SupplyShortcut, Product } from '@/src/types';
import { 
  Plus, 
  Search, 
  Calendar, 
  Trash2, 
  Loader2,
  Zap,
  Filter,
  X,
  Package
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
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/src/components/ui/ToastContext';

export default function Purchases() {
  const { addToast } = useToast();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [shortcuts, setShortcuts] = useState<SupplyShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isShortcutDialogOpen, setIsShortcutDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<string | null>(null);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [newSupply, setNewSupply] = useState({
    name: '',
    product_id: '',
    quantity: '',
    unit: 'unidad',
    unit_cost: '',
    purchase_date: new Date().toISOString().split('T')[0]
  });

  const [newShortcutName, setNewShortcutName] = useState('');

  useEffect(() => {
    fetchSupplies();
    fetchShortcuts();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name').eq('active', true).order('name');
    setProducts(data || []);
  };

  const fetchSupplies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplies')
        .select('*')
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      setSupplies(data || []);
    } catch (error) {
      console.error('Error fetching supplies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShortcuts = async () => {
    try {
      const { data, error } = await supabase
        .from('supply_shortcuts')
        .select('*')
        .order('name');
      if (error) throw error;
      setShortcuts(data || []);
    } catch (error) {
      console.error('Error fetching shortcuts:', error);
    }
  };

  const handleAddSupply = async () => {
    if (!newSupply.name || !newSupply.quantity || !newSupply.unit_cost) {
      addToast('Por favor completa los campos obligatorios', 'error');
      return;
    }
    try {
      const total_cost = Number(newSupply.quantity) * Number(newSupply.unit_cost);
      let deltaQuantity = Number(newSupply.quantity);
      
      if (editingSupply) {
        deltaQuantity = Number(newSupply.quantity) - editingSupply.quantity;
        
        const { error: supplyError } = await supabase
          .from('supplies')
          .update({
            name: newSupply.name,
            quantity: Number(newSupply.quantity),
            unit: newSupply.unit,
            unit_cost: Number(newSupply.unit_cost),
            total_cost,
            purchase_date: newSupply.purchase_date
          })
          .eq('id', editingSupply.id);
          
        if (supplyError) throw supplyError;
      } else {
        const { error: supplyError } = await supabase
          .from('supplies')
          .insert([{
            name: newSupply.name,
            quantity: Number(newSupply.quantity),
            unit: newSupply.unit,
            unit_cost: Number(newSupply.unit_cost),
            total_cost,
            purchase_date: newSupply.purchase_date
          }]);

        if (supplyError) throw supplyError;
      }

      // 2. Update Inventory
      // Use product_id if available, otherwise fallback to name matching
      let targetProductId = newSupply.product_id;
      
      if (!targetProductId) {
        const { data: matchingProducts } = await supabase
          .from('products')
          .select('id')
          .eq('name', newSupply.name)
          .limit(1);
        
        if (matchingProducts && matchingProducts.length > 0) {
          targetProductId = matchingProducts[0].id;
        }
      }

      if (targetProductId) {
        // Get current stock to be safe
        const { data: product } = await supabase
          .from('products')
          .select('stock_actual')
          .eq('id', targetProductId)
          .single();

        if (product) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ 
              stock_actual: product.stock_actual + deltaQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', targetProductId);
          
          if (stockError) console.error('Error updating product stock from purchase:', stockError);
        }
      }
      
      setIsDialogOpen(false);
      setEditingSupply(null);
      setNewSupply({
        name: '',
        product_id: '',
        quantity: '',
        unit: 'unidad',
        unit_cost: '',
        purchase_date: new Date().toISOString().split('T')[0]
      });
      fetchSupplies();
      addToast(editingSupply ? 'Compra actualizada con éxito' : 'Compra de insumo registrada', 'success');
    } catch (error: any) {
      console.error('Error adding supply:', error);
      addToast(`Error al guardar el insumo: ${error.message || 'Error desconocido'}`, 'error');
    }
  };

  const handleAddShortcut = async () => {
    if (!newShortcutName) return;
    try {
      const { error } = await supabase
        .from('supply_shortcuts')
        .insert([{ name: newShortcutName }]);
      if (error) throw error;
      setNewShortcutName('');
      setIsShortcutDialogOpen(false);
      fetchShortcuts();
      addToast('Atajo creado con éxito', 'success');
    } catch (error: any) {
      console.error('Error adding shortcut:', error);
      addToast('Error al crear el atajo', 'error');
    }
  };

  const handleDeleteClick = (id: string) => {
    setSupplyToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplyToDelete) return;
    try {
      // 1. Get the supply info before deleting to know what to revert
      const { data: supply } = await supabase
        .from('supplies')
        .select('*')
        .eq('id', supplyToDelete)
        .single();

      if (supply) {
        // 2. Check if it matches a product to revert stock
        const { data: matchingProducts } = await supabase
          .from('products')
          .select('id, stock_actual')
          .eq('name', supply.name)
          .limit(1);

        if (matchingProducts && matchingProducts.length > 0) {
          const product = matchingProducts[0];
          await supabase
            .from('products')
            .update({ 
              stock_actual: Math.max(0, product.stock_actual - supply.quantity),
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);
        }
      }

      // 3. Delete the supply record
      const { error } = await supabase.from('supplies').delete().eq('id', supplyToDelete);
      if (error) throw error;
      fetchSupplies();
      fetchProducts();
      addToast('Registro de compra eliminado', 'success');
    } catch (error) {
      console.error('Error deleting supply:', error);
      addToast('Error al eliminar el registro de compra', 'error');
    } finally {
      setIsConfirmOpen(false);
      setSupplyToDelete(null);
    }
  };

  const handleShortcutClick = (name: string) => {
    setNewSupply({
      ...newSupply,
      name: name
    });
    setIsDialogOpen(true);
  };

  const filteredSupplies = supplies.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || item.purchase_date === dateFilter;
    return matchesSearch && matchesDate;
  });

  const totalInvestment = filteredSupplies.reduce((acc, curr) => acc + curr.total_cost, 0);

  const groupedSupplies = filteredSupplies.reduce((acc, item) => {
    const date = item.purchase_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, Supply[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras e Insumos</h1>
          <p className="text-slate-500">Registra marcos, láminas y materiales para calcular ganancias</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isShortcutDialogOpen} onOpenChange={setIsShortcutDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="border-slate-200" />}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Atajo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Atajo Directo</DialogTitle>
                <DialogDescription>Añade un nombre de insumo frecuente para cargarlo más rápido.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="shortcut-name">Nombre del Insumo</Label>
                <Input 
                  id="shortcut-name" 
                  placeholder="Ej: Marco 40x50" 
                  value={newShortcutName}
                  onChange={(e) => setNewShortcutName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsShortcutDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddShortcut} className="bg-blue-600 text-white">Crear Atajo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Compra
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSupply ? 'Editar Compra' : 'Nueva Compra de Insumos'}</DialogTitle>
                <DialogDescription>
                  {editingSupply ? 'Modifica los detalles de la compra seleccionada.' : 'Ingresa los detalles del material o insumo comprado.'}
                </DialogDescription>
              </DialogHeader>

              {/* Shortcuts inside Dialog */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  Atajos rápidos
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {shortcuts.map((shortcut) => (
                    <Button 
                      key={shortcut.id} 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-7 px-2 text-[11px] rounded-md border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all",
                        newSupply.name === shortcut.name && "bg-blue-50 text-blue-600 border-blue-200"
                      )}
                      onClick={() => setNewSupply({...newSupply, name: shortcut.name})}
                    >
                      {shortcut.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="product-select">Vincular con Producto del Catálogo (Opcional)</Label>
                  <Select 
                    value={newSupply.product_id}
                    onValueChange={(val) => {
                      const prod = products.find(p => p.id === val);
                      if (prod) setNewSupply({...newSupply, product_id: val, name: prod.name});
                    }}
                  >
                    <SelectTrigger id="product-select" className="bg-slate-50">
                      <SelectValue placeholder="Seleccionar producto existente...">
                        {products.find(p => p.id === newSupply.product_id)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 italic">Si seleccionas un producto, el stock se actualizará automáticamente.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Insumo / Producto</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej: Varilla de madera, Vidrio 2mm, etc." 
                    value={newSupply.name}
                    onChange={(e) => setNewSupply({...newSupply, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      placeholder="0" 
                      value={newSupply.quantity}
                      onChange={(e) => setNewSupply({...newSupply, quantity: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad</Label>
                    <Input 
                      id="unit" 
                      placeholder="Ej: metros, m2, unidad" 
                      value={newSupply.unit}
                      onChange={(e) => setNewSupply({...newSupply, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost">Costo Unitario</Label>
                    <Input 
                      id="cost" 
                      type="number" 
                      placeholder="0.00" 
                      value={newSupply.unit_cost}
                      onChange={(e) => setNewSupply({...newSupply, unit_cost: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={newSupply.purchase_date}
                      onChange={(e) => setNewSupply({...newSupply, purchase_date: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddSupply} className="bg-blue-600 hover:bg-blue-700 text-white">Guardar Registro</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Filtrar por nombre de insumo..." 
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
            {(searchTerm || dateFilter) && (
              <Button 
                variant="ghost" 
                onClick={() => {setSearchTerm(''); setDateFilter('');}}
                className="text-slate-500"
              >
                <X className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Inversión Filtrada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${totalInvestment.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Total según filtros aplicados</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Última Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {supplies.length > 0 ? `$${supplies[0].total_cost.toLocaleString()}` : '$0'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {supplies.length > 0 ? supplies[0].name : 'Sin registros'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Insumos Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{supplies.length}</div>
            <div className="text-xs text-slate-500 mt-1">Total histórico</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Historial de Compras</CardTitle>
          <CardDescription>Listado detallado de materiales e insumos adquiridos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Cargando insumos...
                    </TableCell>
                  </TableRow>
                ) : filteredSupplies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                      No se encontraron compras con estos filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(groupedSupplies).map(([date, items]) => (
                    <React.Fragment key={date}>
                      <TableRow className="bg-slate-100/60 hover:bg-slate-100/60">
                        <TableCell colSpan={6} className="font-semibold text-slate-800 py-2 border-b-2 border-slate-200 uppercase text-xs tracking-wider">
                          {date}
                        </TableCell>
                      </TableRow>
                      {items.map((item) => (
                        <TableRow 
                          key={item.id} 
                          className="hover:bg-blue-50 cursor-pointer transition-colors group"
                          onClick={() => {
                            setEditingSupply(item);
                            setNewSupply({
                              name: item.name,
                              product_id: '',
                              quantity: item.quantity.toString(),
                              unit: item.unit,
                              unit_cost: item.unit_cost.toString(),
                              purchase_date: item.purchase_date
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <TableCell className="font-medium text-slate-500 pl-4">
                            {item.purchase_date}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">{item.name}</div>
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            ${item.unit_cost.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            ${item.total_cost.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(item.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de esta compra de insumos.
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
