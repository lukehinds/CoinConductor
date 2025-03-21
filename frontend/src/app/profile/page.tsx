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
      <div className="px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Profile Information</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Update your account information and password.
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <form onSubmit={handleProfileUpdate}>
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-4">
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Username
                      </label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Account Actions</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage your account access and deletion.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="flex flex-col space-y-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Logout
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}