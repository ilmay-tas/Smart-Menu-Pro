import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { MenuItem, User } from '@/types/restaurant';
import { Plus, Pencil, Trash2, LogOut, Users, UtensilsCrossed, Check, X, Loader2 } from 'lucide-react';

export default function OwnerDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '', description: '' });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [menuData, staffData] = await Promise.all([
        apiGet<{ menu_items: MenuItem[] }>('/menu/'),
        apiGet<{ staff: User[] }>('/staff/'),
      ]);
      setMenuItems(menuData.menu_items);
      setStaff(staffData.staff);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, price: item.price.toString(), description: item.description || '' });
    } else {
      setEditingItem(null);
      setFormData({ name: '', price: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSaveMenuItem = async () => {
    try {
      if (editingItem) {
        await apiPut(`/menu/${editingItem.id}`, {
          name: formData.name,
          price: parseFloat(formData.price),
          description: formData.description,
        });
        toast({ title: 'Success', description: 'Menu item updated' });
      } else {
        await apiPost('/menu/', {
          name: formData.name,
          price: parseFloat(formData.price),
          description: formData.description,
        });
        toast({ title: 'Success', description: 'Menu item created' });
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDeleteMenuItem = async (id: number) => {
    try {
      await apiDelete(`/menu/${id}`);
      toast({ title: 'Success', description: 'Menu item deleted' });
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleApproveStaff = async (staffId: number) => {
    try {
      await apiPost(`/staff/${staffId}/approve`);
      toast({ title: 'Success', description: 'Staff member approved' });
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleRevokeStaff = async (staffId: number) => {
    try {
      await apiPost(`/staff/${staffId}/revoke`);
      toast({ title: 'Success', description: 'Staff access revoked' });
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Owner Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.restaurant_name}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="menu">
          <TabsList className="mb-6">
            <TabsTrigger value="menu" data-testid="tab-menu">
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              Menu Items
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff">
              <Users className="h-4 w-4 mr-2" />
              Staff Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <h2 className="text-2xl font-bold">Menu Items</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} data-testid="button-add-menu-item">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="item-name">Name</Label>
                      <Input
                        id="item-name"
                        data-testid="input-menu-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item-price">Price ($)</Label>
                      <Input
                        id="item-price"
                        type="number"
                        step="0.01"
                        data-testid="input-menu-price"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item-description">Description</Label>
                      <Textarea
                        id="item-description"
                        data-testid="input-menu-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleSaveMenuItem} className="w-full" data-testid="button-save-menu-item">
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {menuItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No menu items yet. Add your first item!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {menuItems.map((item) => (
                  <Card key={item.id} data-testid={`card-menu-item-${item.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <p className="text-2xl font-bold text-primary">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(item)} data-testid={`button-edit-${item.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteMenuItem(item.id)} data-testid={`button-delete-${item.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    {item.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="staff">
            <h2 className="text-2xl font-bold mb-6">Staff Management</h2>

            {staff.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No staff members have signed up yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {staff.map((member) => (
                  <Card key={member.id} data-testid={`card-staff-${member.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{member.username}</CardTitle>
                        <CardDescription className="capitalize">{member.role}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.is_approved ? (
                          <Badge variant="default" className="bg-green-600">Approved</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {!member.is_approved && (
                          <Button onClick={() => handleApproveStaff(member.id)} size="sm" data-testid={`button-approve-${member.id}`}>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {member.is_approved && (
                          <Button onClick={() => handleRevokeStaff(member.id)} size="sm" variant="destructive" data-testid={`button-revoke-${member.id}`}>
                            <X className="h-4 w-4 mr-1" />
                            Revoke Access
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
