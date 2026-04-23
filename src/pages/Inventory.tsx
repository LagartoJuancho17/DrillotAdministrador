import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Product } from '@/src/types';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  History,
  RefreshCw,
  Plus,
  Minus,
  Edit,
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
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/src/components/ui/ToastContext';

export default function Inventory() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('1');
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'marco',
    description: '',
    cost_price: '',
    sale_price: '',
    wholesale_price: '',
    stock_actual: '0',
    stock_minimo: '5',
    active: true
  });

  useEffect(() => {
    fetchProducts();
    fetchRecentPurchases();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      // Obtener todas las compras (supplies)
      const { data: allSupplies, error: suppliesError } = await supabase.from('supplies').select('*');
      if (suppliesError) throw suppliesError;

      // Obtener todos los productos actuales
      const { data: allProducts, error: productsError } = await supabase.from('products').select('*');
      if (productsError) throw productsError;

      // Agrupar compras por nombre y sumar cantidades
      const supplyTotals = (allSupplies || []).reduce((acc: any, supply: any) => {
        acc[supply.name] = (acc[supply.name] || 0) + supply.quantity;
        return acc;
      }, {});

      // Encontrar qué productos faltan en el inventario
      const missingProducts = [];
      
      for (const [name, quantity] of Object.entries(supplyTotals)) {
        const exists = allProducts?.find(p => p.name.toLowerCase() === name.toLowerCase());
        
        if (!exists) {
          missingProducts.push({
            name: name,
            category: 'marco',
            cost_price: 0,
            sale_price: 0,
            wholesale_price: 0,
            stock_actual: quantity, // Usar el total sumado
            stock_minimo: 5,
            active: true
          });
        }
      }

      // Si hay productos faltantes (que solo estaban en compras), los creamos
      if (missingProducts.length > 0) {
        const { error: insertError } = await supabase.from('products').insert(missingProducts);
        if (insertError) {
          console.error('Error al insertar productos faltantes:', insertError);
        }
      }

      // Actualizar la vista
      await Promise.all([
        fetchProducts(),
        fetchRecentPurchases()
      ]);
      addToast('Inventario sincronizado', 'success');
    } catch (error) {
      console.error('Error sincronizando inventario', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      sku: product.sku || '',
      category: product.category,
      description: product.description || '',
      cost_price: product.cost_price.toString(),
      sale_price: product.sale_price.toString(),
      wholesale_price: product.wholesale_price.toString(),
      stock_actual: product.stock_actual.toString(),
      stock_minimo: product.stock_minimo.toString(),
      active: product.active
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.sale_price) {
      addToast('Por favor completa el nombre y el precio de venta', 'error');
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name: newProduct.name,
        sku: newProduct.sku,
        category: newProduct.category,
        description: newProduct.description,
        cost_price: parseFloat(newProduct.cost_price) || 0,
        sale_price: parseFloat(newProduct.sale_price) || 0,
        wholesale_price: parseFloat(newProduct.wholesale_price) || 0,
        stock_actual: parseInt(newProduct.stock_actual) || 0,
        stock_minimo: parseInt(newProduct.stock_minimo) || 5,
        active: newProduct.active,
        updated_at: new Date().toISOString()
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
      }
      
      setIsAddDialogOpen(false);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        sku: '',
        category: 'marco',
        description: '',
        cost_price: '',
        sale_price: '',
        wholesale_price: '',
        stock_actual: '0',
        stock_minimo: '5',
        active: true
      });
      fetchProducts();
      addToast(editingProduct ? 'Producto actualizado' : 'Producto agregado con éxito', 'success');
    } catch (error: any) {
      console.error('Error saving product:', error);
      addToast(`Error al guardar el producto: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProductToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', productToDelete);
      if (error) throw error;
      
      // Refresh both products and recent purchases
      await handleSync();
      setIsConfirmOpen(false);
      addToast('Producto eliminado permanentemente', 'success');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      addToast('No se pudo eliminar el producto. Es posible que esté asociado a una venta existente.', 'error');
    } finally {
      setSaving(false);
      setProductToDelete(null);
    }
  };

  const fetchRecentPurchases = async () => {
    const { data } = await supabase
      .from('supplies')
      .select('*')
      .order('purchase_date', { ascending: false })
      .limit(5);
    setRecentPurchases(data || []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('stock_actual', { ascending: true });
      
      if (error) throw error;
      
      // Filtrar para mostrar solo los marcos/cuadros
      const marcosOnly = (data || []).filter((p: Product) => {
        const name = p.name.toLowerCase();
        const isMarco = name.includes('marco') || name.includes('cuadro');
        const isExplicitMarcoCat = p.category === 'marco' && 
          !name.includes('lamina') && 
          !name.includes('lámina') && 
          !name.includes('acrilico') && 
          !name.includes('acrílico') && 
          !name.includes('barniz');
          
        return isMarco || isExplicitMarcoCat;
      });
      
      setProducts(marcosOnly);
    } catch (error) {
      console.error('Error fetching products for inventory:', error);
      // Fallback mock data if supabase is not configured
      setProducts([
        {
          id: '1',
          name: 'Marco Madera Natural 20x30',
          sku: 'M-2030-NAT',
          category: 'marco',
          description: 'Marco de madera de pino natural con vidrio',
          image_url: null,
          cost_price: 1200,
          sale_price: 2500,
          wholesale_price: 1800,
          stock_actual: 15,
          stock_minimo: 5,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct) return;
    
    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('Por favor ingresa una cantidad válida', 'error');
      return;
    }

    const newStock = adjustmentType === 'add' 
      ? selectedProduct.stock_actual + amount 
      : selectedProduct.stock_actual - amount;

    if (newStock < 0) {
      addToast('El stock no puede ser negativo', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_actual: newStock, updated_at: new Date().toISOString() })
        .eq('id', selectedProduct.id);

      if (error) throw error;
      
      setIsAdjustDialogOpen(false);
      fetchProducts();
      addToast('Stock actualizado correctamente', 'success');
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      addToast(`Error al ajustar stock: ${error.message}`, 'error');
    }
  };

  const openAdjustDialog = (product: Product, type: 'add' | 'remove') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setAdjustmentAmount('1');
    setIsAdjustDialogOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock_actual <= p.stock_minimo && p.stock_actual > 0).length;
  const outOfStockCount = products.filter(p => p.stock_actual <= 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Inventario</h1>
          <p className="text-slate-500">Monitorea y ajusta los niveles de stock de tus productos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
          <Button variant="outline" onClick={handleSync} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Productos</p>
                <p className="text-2xl font-bold text-slate-900">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Stock Bajo</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Sin Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por nombre o SKU..." 
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
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Ajuste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                          Cargando inventario...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                          No se encontraron productos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <div className="font-medium text-slate-900">{product.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono uppercase">{product.sku || '---'}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={cn(
                              "font-bold",
                              product.stock_actual <= 0 ? "bg-red-100 text-red-700" :
                              product.stock_actual <= product.stock_minimo ? "bg-orange-100 text-orange-700" :
                              "bg-emerald-100 text-emerald-700"
                            )}>
                              {product.stock_actual}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {product.stock_actual <= 0 ? (
                              <Badge variant="destructive" className="text-[10px] uppercase">Agotado</Badge>
                            ) : product.stock_actual <= product.stock_minimo ? (
                              <Badge className="bg-orange-500 text-white text-[10px] uppercase">Bajo</Badge>
                            ) : (
                              <Badge className="bg-emerald-500 text-white text-[10px] uppercase">Ok</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                onClick={() => handleEditClick(product)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-red-400 hover:text-red-600"
                                onClick={(e) => handleDeleteClick(e, product.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              <div className="w-px h-4 bg-slate-200 mx-1" />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-red-600 hover:bg-red-50"
                                onClick={() => openAdjustDialog(product, 'remove')}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => openAdjustDialog(product, 'add')}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-violet-600" />
                Compras Recientes
              </CardTitle>
              <CardDescription className="text-xs">Insumos que alimentan el stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPurchases.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay compras registradas</p>
                ) : (
                  recentPurchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{purchase.name}</p>
                        <p className="text-[10px] text-slate-500">{purchase.purchase_date}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-emerald-600">+{purchase.quantity}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{purchase.unit}</div>
                      </div>
                    </div>
                  ))
                )}
                <Button 
                  variant="ghost" 
                  className="w-full text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                  onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'purchases' }))}
                >
                  Ver todas las compras
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-violet-600 text-white">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">Sincronización Activa</h3>
                  <p className="text-xs text-violet-100 mt-1 leading-relaxed">
                    Tus compras de insumos se vinculan automáticamente con los productos del catálogo que tengan el mismo nombre.
                  </p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full bg-white text-violet-600 hover:bg-violet-50 border-none"
                  onClick={handleSync}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    'Sincronizar Ahora'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Aumentar Stock' : 'Disminuir Stock'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-500">Stock Actual:</span>
              <span className="font-bold text-slate-900">{selectedProduct?.stock_actual}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Cantidad a {adjustmentType === 'add' ? 'sumar' : 'restar'}</Label>
              <Input 
                id="amount" 
                type="number" 
                min="1"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAdjustStock}
              className={cn(
                "text-white",
                adjustmentType === 'add' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              )}
            >
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los datos del producto seleccionado.' : 'Completa los datos para agregar un nuevo marco o lámina.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre comercial</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Marco Madera A4" 
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">Código SKU</Label>
                <Input 
                  id="sku" 
                  placeholder="Ej: M-A4-NAT" 
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select 
                  value={newProduct.category} 
                  onValueChange={(val) => setNewProduct({...newProduct, category: val})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marco">Marco</SelectItem>
                    <SelectItem value="lamina">Lámina</SelectItem>
                    <SelectItem value="accesorio">Accesorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Inicial</Label>
                <Input 
                  id="stock" 
                  type="number" 
                  value={newProduct.stock_actual}
                  onChange={(e) => setNewProduct({...newProduct, stock_actual: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Precio Costo</Label>
                <Input 
                  id="cost" 
                  type="number" 
                  placeholder="0.00" 
                  value={newProduct.cost_price}
                  onChange={(e) => setNewProduct({...newProduct, cost_price: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale">Precio Venta</Label>
                <Input 
                  id="sale" 
                  type="number" 
                  placeholder="0.00" 
                  value={newProduct.sale_price}
                  onChange={(e) => setNewProduct({...newProduct, sale_price: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wholesale">Precio Mayorista</Label>
                <Input 
                  id="wholesale" 
                  type="number" 
                  placeholder="0.00" 
                  value={newProduct.wholesale_price}
                  onChange={(e) => setNewProduct({...newProduct, wholesale_price: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              setEditingProduct(null);
            }}>Cancelar</Button>
            <Button 
              onClick={handleSaveProduct} 
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={saving}
            >
              {saving ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Deseas eliminar esto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará el producto permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={saving}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={saving}
            >
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
