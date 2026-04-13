import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { ShippingInfo, Order } from '@/src/types';
import { 
  Plus, 
  Truck, 
  Search, 
  Package, 
  MapPin, 
  Calendar,
  ExternalLink,
  Loader2,
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ShippingProps {
  initialOrderId?: string | null;
  onClearInitialOrder?: () => void;
}

export default function Shipping({ initialOrderId, onClearInitialOrder }: ShippingProps) {
  const [shippingList, setShippingList] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [shippingToDelete, setShippingToDelete] = useState<string | null>(null);
  const [newShipping, setNewShipping] = useState({
    order_id: '',
    provider: 'Andreani',
    tracking_number: '',
    shipping_status: 'en_preparacion',
    destination_address: '',
    shipping_cost: '',
    pickup_cost: '',
    is_pickup: false
  });

  useEffect(() => {
    fetchShipping();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      setNewShipping(prev => ({ ...prev, order_id: initialOrderId }));
      setIsDialogOpen(true);
      if (onClearInitialOrder) {
        onClearInitialOrder();
      }
    }
  }, [initialOrderId, orders]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number')
        .order('order_number', { ascending: false });
      
      if (error) throw error;
      console.log('Pedidos cargados para envíos:', data?.length);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders for shipping:', error);
    }
  };

  const fetchShipping = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipping_info')
        .select('*, order:orders(order_number, client:clients(name))')
        .order('id', { ascending: false });
      
      if (error) throw error;
      setShippingList(data || []);
    } catch (error) {
      console.error('Error fetching shipping:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShipping = async () => {
    if (!newShipping.order_id) {
      alert('Por favor selecciona un pedido');
      return;
    }

    setSaving(true);
    try {
      const sCost = Number(newShipping.shipping_cost) || 0;
      const pCost = Number(newShipping.pickup_cost) || 0;
      const finalCost = sCost + pCost;

      console.log('Intentando guardar envío:', {
        order_id: newShipping.order_id,
        cost: finalCost,
        is_pickup: newShipping.is_pickup
      });

      const { error } = await supabase
        .from('shipping_info')
        .insert([{
          order_id: newShipping.order_id,
          provider: newShipping.is_pickup ? 'PICKUP' : newShipping.provider,
          tracking_number: newShipping.tracking_number || null,
          shipping_status: newShipping.shipping_status,
          destination_address: newShipping.destination_address || null,
          cost: finalCost,
          is_pickup: newShipping.is_pickup
        }]);

      if (error) {
        console.error('Error de Supabase al guardar envío:', error);
        throw error;
      }
      
      console.log('Envío guardado exitosamente');
      setIsDialogOpen(false);
      setNewShipping({
        order_id: '',
        provider: 'Andreani',
        tracking_number: '',
        shipping_status: 'en_preparacion',
        destination_address: '',
        shipping_cost: '',
        pickup_cost: '',
        is_pickup: false
      });
      fetchShipping();
    } catch (error: any) {
      console.error('Error adding shipping:', error);
      alert(`Error al registrar el envío: ${error.message || 'Error desconocido'}. Asegúrate de haber ejecutado el SQL completo en Supabase.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setShippingToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!shippingToDelete) return;
    try {
      const { error } = await supabase.from('shipping_info').delete().eq('id', shippingToDelete);
      if (error) throw error;
      fetchShipping();
    } catch (error) {
      console.error('Error deleting shipping:', error);
      alert('Error al eliminar el envío.');
    } finally {
      setIsConfirmOpen(false);
      setShippingToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Envíos</h1>
          <p className="text-slate-500">Registra y sigue los envíos de tus pedidos manualmente</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-violet-600 hover:bg-violet-700 text-white" />}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Envío
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Envío</DialogTitle>
              <DialogDescription>Ingresa los datos del envío para seguimiento manual.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2 mb-2">
                <input 
                  type="checkbox" 
                  id="is_pickup" 
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={newShipping.is_pickup}
                  onChange={(e) => setNewShipping({...newShipping, is_pickup: e.target.checked})}
                />
                <Label htmlFor="is_pickup" className="font-bold text-violet-700">Servicio de PICKUP (Retiro)</Label>
              </div>

              <div className="space-y-2">
                <Label>Pedido</Label>
                <Select 
                  value={newShipping.order_id} 
                  onValueChange={(val) => setNewShipping({...newShipping, order_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={orders.length === 0 ? "No hay pedidos disponibles" : "Seleccionar pedido"}>
                      {orders.find(o => o.id === newShipping.order_id)?.order_number}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {orders.length === 0 ? (
                      <SelectItem value="none" disabled>No hay pedidos registrados</SelectItem>
                    ) : (
                      orders.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {orders.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    * Debes crear una Venta primero para poder asignarle un envío.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transportista</Label>
                  <Select 
                    disabled={newShipping.is_pickup}
                    value={newShipping.is_pickup ? 'PICKUP' : newShipping.provider} 
                    onValueChange={(val) => setNewShipping({...newShipping, provider: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Andreani">Andreani</SelectItem>
                      <SelectItem value="OCA">OCA</SelectItem>
                      <SelectItem value="Correo Argentino">Correo Argentino</SelectItem>
                      <SelectItem value="Moto Mensajería">Moto Mensajería</SelectItem>
                      <SelectItem value="Retiro en Local">Retiro en Local</SelectItem>
                      <SelectItem value="PICKUP">PICKUP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-violet-600 font-bold">
                    Precio de Envío ($)
                  </Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={newShipping.shipping_cost}
                    onChange={(e) => setNewShipping({...newShipping, shipping_cost: e.target.value})}
                    className="border-violet-200 bg-violet-50/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-emerald-600 font-bold">
                    Precio de Pick Up ($)
                  </Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={newShipping.pickup_cost}
                    onChange={(e) => setNewShipping({...newShipping, pickup_cost: e.target.value})}
                    className="border-emerald-200 bg-emerald-50/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={newShipping.shipping_status} onValueChange={(val) => setNewShipping({...newShipping, shipping_status: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_preparacion">En Preparación</SelectItem>
                      <SelectItem value="despachado">Despachado</SelectItem>
                      <SelectItem value="en_transito">En Tránsito</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Seguimiento</Label>
                  <Input 
                    placeholder="Ej: AR123456789" 
                    value={newShipping.tracking_number}
                    onChange={(e) => setNewShipping({...newShipping, tracking_number: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección de Destino</Label>
                  <Input 
                    placeholder="Calle, Número, Ciudad, CP" 
                    value={newShipping.destination_address}
                    onChange={(e) => setNewShipping({...newShipping, destination_address: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleAddShipping} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                {saving ? 'Guardando...' : 'Guardar Envío'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Envíos Activos</CardTitle>
          <CardDescription>Seguimiento de paquetes despachados y por entregar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Cargando envíos...
                    </TableCell>
                  </TableRow>
                ) : shippingList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                      No hay envíos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  shippingList.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-bold text-slate-900">
                        {item.order?.order_number}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {item.order?.client?.name || 'Cliente Final'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.is_pickup ? (
                            <Badge className="bg-violet-100 text-violet-700 border-violet-200">PICKUP</Badge>
                          ) : (
                            <>
                              <Truck className="w-4 h-4 text-slate-400" />
                              <span>{item.provider}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        ${(item.cost || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.is_pickup ? 'N/A' : (item.tracking_number || 'S/N')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "px-2 py-0.5",
                          item.shipping_status === 'entregado' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          item.shipping_status === 'despachado' ? "bg-violet-50 text-violet-700 border-violet-100" : "bg-slate-50 text-slate-600"
                        )}>
                          {item.shipping_status.replace('_', ' ')}
                        </Badge>
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de este envío.
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
