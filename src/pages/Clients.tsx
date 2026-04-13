import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Client, ClientCategory } from '@/src/types';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Instagram,
  MapPin,
  History,
  UserPlus
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
import { cn } from '@/lib/utils';

const categoryConfig: Record<ClientCategory, { label: string, color: string }> = {
  nuevo: { label: 'Nuevo', color: 'bg-violet-50 text-violet-700 border-violet-100' },
  regular: { label: 'Regular', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  vip: { label: 'VIP', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  mayorista: { label: 'Mayorista', color: 'bg-orange-50 text-orange-700 border-orange-100' },
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    instagram: '',
    address: '',
    category: 'nuevo' as ClientCategory,
    notes: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    setSaving(true);
    try {
      // Get last client number to increment
      const { data: lastClients, error: fetchError } = await supabase
        .from('clients')
        .select('client_number')
        .order('client_number', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching last client number:', fetchError);
      }

      let nextNumber = 1;
      if (lastClients && lastClients.length > 0 && lastClients[0].client_number) {
        // Extract number from C-XXXXX format
        const match = lastClients[0].client_number.match(/\d+/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }

      const clientNumber = `C-${nextNumber.toString().padStart(5, '0')}`;

      const { error: insertError } = await supabase
        .from('clients')
        .insert([{
          ...newClient,
          client_number: clientNumber
        }]);

      if (insertError) throw insertError;
      
      setIsDialogOpen(false);
      setNewClient({
        name: '',
        phone: '',
        email: '',
        instagram: '',
        address: '',
        category: 'nuevo',
        notes: ''
      });
      fetchClients();
    } catch (error: any) {
      console.error('Error adding client:', error);
      alert(`Error al registrar el cliente: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setClientToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientToDelete);
      if (error) throw error;
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente. Puede que tenga pedidos asociados.');
    } finally {
      setIsConfirmOpen(false);
      setClientToDelete(null);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
          <p className="text-slate-500">Administra tu base de datos de contactos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-violet-600 hover:bg-violet-700 text-white" />}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
              <DialogDescription>Ingresa los datos del cliente para tu base de datos.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input 
                  id="name" 
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input 
                    id="phone" 
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input 
                    id="instagram" 
                    placeholder="@usuario"
                    value={newClient.instagram}
                    onChange={(e) => setNewClient({...newClient, instagram: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input 
                  id="address" 
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select 
                  value={newClient.category} 
                  onValueChange={(val: ClientCategory) => setNewClient({...newClient, category: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">Nuevo</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="mayorista">Mayorista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleAddClient} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                {saving ? 'Guardando...' : 'Guardar Cliente'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre, email o teléfono..." 
              className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                      Cargando clientes...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const category = categoryConfig[client.category];
                    return (
                      <TableRow key={client.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-500">
                          {client.client_number || '---'}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900">{client.name}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Instagram className="w-3 h-3" />
                            {client.instagram || 'No especificado'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {client.phone || '-'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {client.email || '-'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("px-2 py-0.5", category.color)}>
                            {category.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2 text-sm text-slate-600 max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span className="truncate">{client.address || 'Sin dirección'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" />
                            }>
                              <MoreHorizontal className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Ficha
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <History className="w-4 h-4 mr-2" />
                                Historial Pedidos
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteClick(client.id)}
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
              Esta acción no se puede deshacer. Se eliminarán los datos del cliente y sus registros asociados.
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
