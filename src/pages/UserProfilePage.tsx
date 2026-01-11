import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TwoFactorSection } from "@/components/TwoFactorAuth";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";

export default function UserProfilePage() {
  const { user, profile, updateProfile, updateEmail, updatePassword } = useAuth();
  const navigate = useNavigate();

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Email form state
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    await updateProfile({
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
    });
    setProfileLoading(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user?.email) {
      return;
    }
    setEmailLoading(true);
    await updateEmail(newEmail);
    setEmailLoading(false);
    setNewEmail("");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    const { error } = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (!error) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
    return { strength, label: labels[Math.min(strength - 1, 4)] || "" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Avatar */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
      </div>

      <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border">
        <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/30 text-primary text-2xl font-semibold">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account information and security settings
          </p>
        </div>
      </div>

      {/* Personal Information Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Personal Information</CardTitle>
          </div>
          <CardDescription>
            Update your personal details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  maxLength={50}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                maxLength={20}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={profileLoading}>
                {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Push Notifications Section */}
      <PushNotificationSettings />

      {/* Two-Factor Authentication Section */}
      {user && <TwoFactorSection userId={user.id} />}

      {/* Email Update Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Address</CardTitle>
          </div>
          <CardDescription>
            Change your account email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Email</Label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You will receive confirmation emails at both your old and new email addresses. 
                You must confirm the change in both emails for it to take effect.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button type="submit" disabled={emailLoading || !newEmail}>
                {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Email
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Update Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Password & Security</CardTitle>
          </div>
          <CardDescription>
            Change your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
              />
              {newPassword && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.strength <= 1
                          ? "bg-red-500 w-1/5"
                          : passwordStrength.strength === 2
                          ? "bg-orange-500 w-2/5"
                          : passwordStrength.strength === 3
                          ? "bg-yellow-500 w-3/5"
                          : passwordStrength.strength === 4
                          ? "bg-blue-500 w-4/5"
                          : "bg-green-500 w-full"
                      }`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>
            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
