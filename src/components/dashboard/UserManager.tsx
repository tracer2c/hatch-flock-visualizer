import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Eye, EyeOff, Shield, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';


interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  user_roles: Array<{
    role: 'company_admin' | 'operations_head' | 'staff';
  }>;
}

const UserManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'staff' as 'company_admin' | 'operations_head' | 'staff'
  });
  const { toast } = useToast();
  const { profile, loading: authLoading, isAdmin } = useAuth();
  

  useEffect(() => {
    if (profile?.company_id) {
      fetchUsers();
    }
  }, [profile?.company_id]);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('company_id', profile?.company_id);

      if (rolesError) throw rolesError;

      const usersWithRoles = profilesData?.map(profile => ({
        ...profile,
        user_roles: rolesData?.filter(role => role.user_id === profile.id) || []
      })) || [];

      setUsers(usersWithRoles as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            first_name: newUser.first_name,
            last_name: newUser.last_name
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            phone: newUser.phone
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        if (newUser.role !== 'company_admin') {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: newUser.role })
            .eq('user_id', authData.user.id);

          if (roleError) throw roleError;
        }

        toast({
          title: "Success",
          description: "User created successfully"
        });

        setNewUser({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          phone: '',
          role: 'staff'
        });
        setIsDialogOpen(false);
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const updateUserRole = async (userId: string, role: 'company_admin' | 'operations_head' | 'staff') => {
    try {
      const companyId = profile?.company_id;
      if (!companyId) throw new Error("Company not found on your profile");

      // A user can legitimately have only one role in a company. Some users ended
      // up with multiple user_roles rows, which made a blanket
      // `UPDATE ... WHERE user_id = ?` hit several rows and violate the
      // UNIQUE(user_id, company_id, role) constraint (HTTP 409). So we consolidate
      // to a single row: keep one, delete the rest, and set the kept row's role.
      const { data: existing, error: fetchErr } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId);
      if (fetchErr) throw fetchErr;

      if (!existing || existing.length === 0) {
        // No role yet — create one.
        const { error: insertErr } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, company_id: companyId, role });
        if (insertErr) throw insertErr;
      } else {
        const [keep, ...extras] = existing;
        // Remove duplicate rows first so the update below can't collide.
        if (extras.length > 0) {
          const { error: delErr } = await supabase
            .from('user_roles')
            .delete()
            .in('id', extras.map((r) => r.id));
          if (delErr) throw delErr;
        }
        const { error: updErr } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('id', keep.id);
        if (updErr) throw updErr;
      }

      toast({
        title: "Success",
        description: "User role updated successfully"
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  };


  const getRoleColor = (role: string) => {
    switch (role) {
      case 'company_admin': return 'bg-red-100 text-red-800';
      case 'operations_head': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return <div className="p-4 text-muted-foreground">Loading authentication...</div>;
  }

  if (!profile?.company_id) {
    return <div className="p-4 text-destructive">Unable to load users. Company not found.</div>;
  }

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        {isAdmin() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="operations_head">Operations Head</SelectItem>
                      <SelectItem value="company_admin">Company Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createUser} className="w-full">
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Company Users
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Company Users ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : 'No name set'
                        }
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'Not set'}</TableCell>
                      <TableCell>
                        <Select 
                          value={user.user_roles[0]?.role || 'staff'} 
                          onValueChange={(value) => updateUserRole(user.id, value as any)}
                          disabled={!isAdmin()}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="operations_head">Operations Head</SelectItem>
                            <SelectItem value="company_admin">Company Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isAdmin()}
                            onClick={() => updateUserStatus(
                              user.id, 
                              user.status === 'active' ? 'inactive' : 'active'
                            )}
                          >
                            {user.status === 'active' ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-red-100 text-red-800">Company Admin</Badge>
                    <span className="text-sm text-foreground">Full read &amp; write access to all pages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-100 text-blue-800">Operations Head</Badge>
                    <span className="text-sm text-foreground">Full read &amp; write access to all pages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-800">Staff</Badge>
                    <span className="text-sm text-foreground">View-only access to all pages (cannot edit or save)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Access is determined by user role. To change a user's access level, update their role in the Company Users tab.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManager;
