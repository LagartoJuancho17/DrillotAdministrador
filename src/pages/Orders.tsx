import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Order, OrderStatus, Product } from '@/src/types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Truck, 
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Download,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
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
import { Client } from '@/src/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import preciosData from '@/precios.json';

const statusConfig: Record<OrderStatus, { label: string, color: string, icon: any }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  en_preparacion: { label: 'En Preparación', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Clock },
  en_camino: { label: 'En Camino', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Truck },
  entregado: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  en_reclamo: { label: 'En Reclamo', color: 'bg-red-50 text-red-800 border-red-100', icon: AlertCircle },
};

interface OrdersProps {
  onManageShipping?: (orderId: string) => void;
}

export default function Orders({ onManageShipping }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pendiente');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newOrder, setNewOrder] = useState({
    client_id: '',
    payment_method: 'Transferencia',
    payment_status: 'pendiente' as any,
    status: 'pendiente' as OrderStatus,
    items: [] as { product_id: string, quantity: number, unit_price: number, size?: string, frame_type?: string }[]
  });
  
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', instagram: '' });

  const handleQuickAddClient = async () => {
    if (!newClientData.name.trim()) return;

    try {
      const { data: lastClients } = await supabase
        .from('clients')
        .select('client_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextUserNum = 1;
      if (lastClients && lastClients.length > 0 && lastClients[0].client_number) {
        const lastNumStr = lastClients[0].client_number.replace('CL', '');
        const lastNum = parseInt(lastNumStr);
        if (!isNaN(lastNum)) {
          nextUserNum = lastNum + 1;
        }
      }
      const newClientNumber = `CL${nextUserNum.toString().padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          client_number: newClientNumber,
          name: newClientData.name,
          phone: newClientData.phone,
          instagram: newClientData.instagram,
          category: 'nuevo'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update clients list
      setClients([...clients, data]);
      // Select the new client
      setNewOrder({ ...newOrder, client_id: data.id });
      // Reset form
      setIsAddingNewClient(false);
      setNewClientData({ name: '', phone: '', instagram: '' });
      
    } catch (err: any) {
      console.error(err);
      alert('Error añadiendo cliente rápido');
    }
  };

  const addItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { product_id: '', quantity: 1, unit_price: 0, size: '', frame_type: 'Madera' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...newOrder.items];
    newItems.splice(index, 1);
    setNewOrder({ ...newOrder, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...newOrder.items];
    newItems[index] = { ...newItems[index], [field]: value };
    const currentItem = newItems[index];
    
    if (['product_id', 'size', 'frame_type'].includes(field)) {
      const product = products.find(p => p.id === currentItem.product_id);
      
      const sizeStr = `${product?.name || ''} ${currentItem.size || ''}`.toLowerCase();
      
      let matchedSize = '';
      const standardSizes = ['A4', 'A3', '40x50', '50x60'];
      for (const size of standardSizes) {
         if (sizeStr.includes(size.toLowerCase())) {
            matchedSize = size;
            break;
         }
      }

      if (field === 'product_id' && product) {
         currentItem.unit_price = product.sale_price;
      }

      if (matchedSize) {
         const frameType = currentItem.frame_type || 'Madera';
         const frameKey = frameType === 'Negro' ? 'madera_negra' : 'madera_natural';
         
         const priceConfig = (preciosData as any)[matchedSize];
         if (priceConfig && priceConfig[frameKey]) {
            currentItem.unit_price = priceConfig[frameKey];
         }
      }
    }
    
    setNewOrder({ ...newOrder, items: newItems });
  };

  const calculateTotal = () => {
    return newOrder.items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
  };

  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('active', true).order('name');
    setProducts(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    setClients(data || []);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (order: Order) => {
    // Load item details
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    
    const mappedItems = items?.map(item => {
       let size = item.size || '';
       let frame_type = 'Sin Marco';
       if (size.includes('- Marco ')) {
           const parts = size.split('- Marco ');
           size = parts[0].trim();
           frame_type = parts[1].trim();
       } else if (size.startsWith('Marco ')) {
           frame_type = size.replace('Marco ', '').trim();
           size = '';
       }

       return {
           product_id: item.product_id,
           quantity: item.quantity,
           unit_price: item.unit_price,
           size,
           frame_type
       };
    }) || [];

    setEditingOrder(order);
    setNewOrder({
      client_id: order.client_id || '',
      payment_method: order.payment_method || 'Transferencia',
      payment_status: order.payment_status as any,
      status: order.status,
      items: mappedItems
    });
    setClientSearch('');
    setIsDialogOpen(true);
  };

  const handleAddOrder = async () => {
    if (!newOrder.client_id || newOrder.items.length === 0) {
      alert('Por favor selecciona un cliente y al menos un producto');
      return;
    }

    try {
      const total = newOrder.items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
      let orderId = editingOrder?.id;

      if (editingOrder) {
        // UPDATE MODE
        // 1. Revert previous stock & delete previous items
        const { data: oldItems } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', orderId);
        if (oldItems) {
          for (const item of oldItems) {
            const { data: prod } = await supabase.from('products').select('stock_actual').eq('id', item.product_id).single();
            if (prod) {
              await supabase.from('products').update({ stock_actual: prod.stock_actual + item.quantity }).eq('id', item.product_id);
            }
          }
        }
        await supabase.from('order_items').delete().eq('order_id', orderId);

        // 2. Update Order
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            client_id: newOrder.client_id,
            total: total,
            subtotal: total,
            payment_method: newOrder.payment_method,
            payment_status: newOrder.payment_status,
            status: newOrder.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
        if (orderError) throw orderError;
      } else {
        // INSERT MODE
        const { data: lastOrders } = await supabase
          .from('orders')
          .select('order_number')
          .order('order_number', { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (lastOrders && lastOrders.length > 0) {
          const lastNumStr = lastOrders[0].order_number.replace('#', '');
          const lastNum = parseInt(lastNumStr);
          if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
          }
        }

        const orderNumber = `#${nextNumber.toString().padStart(5, '0')}`;

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([{
            order_number: orderNumber,
            client_id: newOrder.client_id,
            total: total,
            subtotal: total,
            payment_method: newOrder.payment_method,
            payment_status: newOrder.payment_status,
            status: newOrder.status
          }])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = orderData.id;
      }

      // 2. Insert Order Items (both Modes)
      const orderItems = newOrder.items.map(item => {
        let finalSize = item.size || '';
        if (item.frame_type && item.frame_type !== 'Sin Marco') {
          finalSize = finalSize ? `${finalSize} - Marco ${item.frame_type}` : `Marco ${item.frame_type}`;
        }
        return {
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
          size: finalSize
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Update Inventory (both Modes)
      for (const item of newOrder.items) {
        // always fetch current fresh stock
        const { data: prod } = await supabase.from('products').select('stock_actual').eq('id', item.product_id).single();
        if (prod) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ stock_actual: prod.stock_actual - item.quantity })
            .eq('id', item.product_id);
          
          if (stockError) console.error('Error updating stock:', stockError);
        }
      }
      
      setIsDialogOpen(false);
      setEditingOrder(null);
      setNewOrder({
        client_id: '',
        payment_method: 'Transferencia',
        payment_status: 'pendiente',
        status: 'pendiente',
        items: []
      });
      setClientSearch('');
      setIsAddingNewClient(false);
      setNewClientData({ name: '', phone: '', instagram: '' });
      fetchOrders();
      fetchProducts(); // Refresh products to get updated stock
    } catch (error: any) {
      console.error('Error adding order:', error);
      alert(`Error al registrar el pedido: ${error.message}`);
    }
  };

  const handleDeleteClick = (id: string) => {
    setOrderToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      // 1. Get order items before deleting to revert stock
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderToDelete);

      // 2. Delete the order (cascade will delete items)
      const { error } = await supabase.from('orders').delete().eq('id', orderToDelete);
      if (error) throw error;

      // 3. Revert stock
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.product_id) {
            // Get current stock
            const { data: product } = await supabase
              .from('products')
              .select('stock_actual')
              .eq('id', item.product_id)
              .single();
            
            if (product) {
              await supabase
                .from('products')
                .update({ stock_actual: product.stock_actual + item.quantity })
                .eq('id', item.product_id);
            }
          }
        }
      }

      fetchOrders();
      fetchProducts();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error al eliminar el pedido.');
    } finally {
      setIsConfirmOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleUpdateStatusClick = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setIsStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedOrder.id);

      if (error) throw error;
      
      setIsStatusDialogOpen(false);
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`Error al actualizar el estado: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client?.client_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ventas y Pedidos</h1>
          <p className="text-slate-500">Gestiona el ciclo completo de tus ventas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Pedido
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOrder ? `Editar Pedido ${editingOrder.order_number}` : 'Nuevo Pedido'}</DialogTitle>
                <DialogDescription>{editingOrder ? 'Modifica los detalles del pedido existente.' : 'Registra una nueva venta en el sistema.'}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Cliente</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-6 text-blue-600 hover:text-blue-800"
                      onClick={() => setIsAddingNewClient(!isAddingNewClient)}
                    >
                      {isAddingNewClient ? 'Cancelar Nuevo' : '+ Nuevo Cliente'}
                    </Button>
                  </div>
                  
                  {isAddingNewClient ? (
                    <div className="p-3 border border-blue-100 bg-blue-50/50 rounded-lg space-y-3">
                      <Input 
                        placeholder="Nombre y Apellido *" 
                        value={newClientData.name} 
                        onChange={(e) => setNewClientData({...newClientData, name: e.target.value})} 
                        className="bg-white text-sm h-8" 
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder="Teléfono (Opcional)" 
                          value={newClientData.phone} 
                          onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})} 
                          className="bg-white text-sm h-8" 
                        />
                        <Input 
                          placeholder="Instagram (Opcional)" 
                          value={newClientData.instagram} 
                          onChange={(e) => setNewClientData({...newClientData, instagram: e.target.value})} 
                          className="bg-white text-sm h-8" 
                        />
                      </div>
                      <Button 
                        type="button" 
                        size="sm" 
                        className="w-full h-8 bg-blue-600 hover:bg-blue-700" 
                        onClick={handleQuickAddClient}
                        disabled={!newClientData.name.trim()}
                      >
                        Crear y Seleccionar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input 
                        placeholder="Buscar cliente por nombre..." 
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="bg-slate-50"
                      />
                      <Select 
                        value={newOrder.client_id} 
                        onValueChange={(val) => setNewOrder({...newOrder, client_id: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente de la lista">
                            {clients.find(c => c.id === newOrder.client_id)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {clients
                            .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                            .map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))
                          }
                          {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                            <SelectItem value="none" disabled>No se encontraron clientes</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Productos / Marcos</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Item
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {newOrder.items.map((item, index) => (
                      <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50 relative space-y-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-red-600"
                          onClick={() => removeItem(index)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <div className="space-y-2 sm:col-span-5">
                            <Label className="text-xs">Producto (Inventario)</Label>
                            <Select 
                              value={item.product_id} 
                              onValueChange={(val) => updateItem(index, 'product_id', val)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Seleccionar producto">
                                  {products.find(p => p.id === item.product_id)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} (Stock: {p.stock_actual})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-4">
                            <Label className="text-xs">Tipo de Marco</Label>
                            <Select 
                              value={item.frame_type || 'Madera'} 
                              onValueChange={(val) => updateItem(index, 'frame_type', val)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Madera">Marco Madera</SelectItem>
                                <SelectItem value="Negro">Marco Negro</SelectItem>
                                <SelectItem value="Blanco">Marco Blanco</SelectItem>
                                <SelectItem value="Sin Marco">Sin Marco</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-3">
                            <Label className="text-xs">Medida</Label>
                            <Input 
                              placeholder="Ej: 40x50" 
                              className="bg-white"
                              value={item.size}
                              onChange={(e) => updateItem(index, 'size', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Cantidad</Label>
                            <Input 
                              type="number" 
                              min="1"
                              className="bg-white"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Precio Unit.</Label>
                            <Input 
                              type="number" 
                              className="bg-white"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Subtotal</Label>
                            <div className="h-10 flex items-center px-3 bg-slate-100 rounded-md font-medium text-slate-700 border border-slate-200">
                              ${(item.unit_price * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {newOrder.items.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                        No hay productos añadidos al pedido
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="text-right">
                    <span className="text-sm text-slate-500">Total del Pedido</span>
                    <div className="text-3xl font-bold text-slate-900">
                      ${calculateTotal().toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Método de Pago</Label>
                    <Select value={newOrder.payment_method} onValueChange={(val) => setNewOrder({...newOrder, payment_method: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado de Pago</Label>
                    <Select value={newOrder.payment_status} onValueChange={(val) => setNewOrder({...newOrder, payment_status: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="parcial">Parcial</SelectItem>
                        <SelectItem value="pagado">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddOrder} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingOrder ? 'Actualizar Pedido' : 'Guardar Pedido'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por número de pedido o cliente..." 
                className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Pago</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                      Cargando pedidos...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                      No se encontraron pedidos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const status = statusConfig[order.status];
                    return (
                      <TableRow 
                        key={order.id} 
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleEditClick(order)}
                      >
                        <TableCell>
                          <div className="font-bold text-slate-900">{order.order_number}</div>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {format(new Date(order.created_at), 'dd MMM, HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="font-medium text-slate-900">{order.client?.name || 'Cliente Final'}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {order.client?.client_number || '---'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("flex items-center gap-1.5 w-fit px-2 py-0.5", status.color)}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          ${order.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
                            order.payment_status === 'pagado' ? "bg-emerald-100 text-emerald-700" : 
                            order.payment_status === 'parcial' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                          )}>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-slate-900"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleUpdateStatusClick(order); }}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Cambiar Estado
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleEditClick(order); }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Editar / Ver Detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <FileText className="w-4 h-4 mr-2" />
                                Generar Remito
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                if (onManageShipping) {
                                  onManageShipping(order.id);
                                }
                              }}>
                                <Truck className="w-4 h-4 mr-2" />
                                Gestionar Envío
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(order.id); }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              Esta acción no se puede deshacer. Se eliminará el pedido y toda su información relacionada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado del Pedido</DialogTitle>
            <DialogDescription>
              Cambia el estado actual del pedido {selectedOrder?.order_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nuevo Estado</Label>
              <Select 
                value={newStatus} 
                onValueChange={(val) => setNewStatus(val as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} disabled={isUpdatingStatus}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={isUpdatingStatus}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdatingStatus ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
