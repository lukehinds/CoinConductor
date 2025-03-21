'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '../components/AuthLayout';

interface User {
  id: number;
  username: string;
  email: string;
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Use the exact URL without relying on redirects
      const response = await fetch('http://localhost:8000/api/users/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      setUser(data);
      setFormData({
        ...formData,
        username: data.username,
        email: data.email,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      interface UpdateData {
        username?: string;
        email?: string;
        password?: string;
      }
      
      const updateData: UpdateData = {};
      
      // Only include fields that have changed
      if (formData.username !== user?.username) {
        updateData.username = formData.username;
      }
      
      if (formData.email !== user?.email) {
        updateData.email = formData.email;
      }
      
      // Only include password if all password fields are filled
      if (formData.currentPassword && formData.newPassword && formData.confirmPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        updateData.password = formData.newPassword;
      }
      
      // Don't make API call if nothing has changed
      if (Object.keys(updateData).length === 0) {
        setSuccessMessage('No changes to save');
        return;
      }

      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Reset password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setSuccessMessage('Profile updated successfully');
      
      // Refresh user data
      fetchUserProfile();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear token and redirect to login
      localStorage.removeItem('token');
      router.push('/login');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <AuthLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="page-title">Profile Settings</h1>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Information Section */}
            <div className="card">
              <div className="md:grid md:grid-cols-3 md:gap-8">
                <div>
                  <h3 className="section-title">Profile Information</h3>
                  <p className="text-muted">
                    Update your account information and email address.
                  </p>
                </div>
                <div className="mt-5 md:mt-0 md:col-span-2">
                  <form onSubmit={handleProfileUpdate}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="username" className="form-label">
                          Username
                        </label>
                        <input
                          type="text"
                          name="username"
                          id="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="form-label">
                          Email address
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="input-field"
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="btn-primary">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="card">
              <div className="md:grid md:grid-cols-3 md:gap-8">
                <div>
                  <h3 className="section-title">Change Password</h3>
                  <p className="text-muted">
                    Ensure your account is using a secure password.
                  </p>
                </div>
                <div className="mt-5 md:mt-0 md:col-span-2">
                  <form onSubmit={handleProfileUpdate}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="form-label">
                          Current Password
                        </label>
                        <input
                          type="password"
                          name="currentPassword"
                          id="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label htmlFor="newPassword" className="form-label">
                          New Password
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          id="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label htmlFor="confirmPassword" className="form-label">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          id="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="input-field"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="btn-primary">
                          Update Password
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Account Actions Section */}
            <div className="card">
              <div className="md:grid md:grid-cols-3 md:gap-8">
                <div>
                  <h3 className="section-title">Account Actions</h3>
                  <p className="text-muted">
                    Manage your account access and deletion.
                  </p>
                </div>
                <div className="mt-5 md:mt-0 md:col-span-2">
                  <div className="space-y-4">
                    <button
                      onClick={handleLogout}
                      className="btn-secondary w-full md:w-auto"
                    >
                      Sign Out
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="btn-danger w-full md:w-auto"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}