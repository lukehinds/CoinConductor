'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';

interface BankAccount {
  id: number;
  name: string;
  account_type: string;
  provider: string;
  secret_id?: string;
  secret_key?: string;
  last_synced?: string;
}

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'checking',
    provider: 'gocardless',
    secret_id: '',
    secret_key: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Use the exact URL without relying on redirects
      try {
        const response = await fetch('http://localhost:8000/api/bank-accounts/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
        });

        console.log('Fetch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch bank accounts: ${errorText}`);
        }

        const data = await response.json();
        console.log('Fetched accounts:', data);
        setAccounts(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/api/bank-accounts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create bank account');
      }

      // Reset form and fetch updated accounts
      setFormData({
        name: '',
        account_type: 'checking',
        provider: 'gocardless',
        secret_id: '',
        secret_key: '',
      });
      setShowAddForm(false);
      fetchAccounts();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedAccount) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/bank-accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update bank account');
      }

      // Reset form and fetch updated accounts
      setFormData({
        name: '',
        account_type: 'checking',
        provider: 'gocardless',
        secret_id: '',
        secret_key: '',
      });
      setSelectedAccount(null);
      setShowEditForm(false);
      fetchAccounts();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;

    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/bank-accounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bank account');
      }

      // Fetch updated accounts
      fetchAccounts();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      account_type: account.account_type,
      provider: account.provider,
      secret_id: account.secret_id || '',
      secret_key: account.secret_key || '',
    });
    setShowEditForm(true);
  };

  const handleSync = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/bank-accounts/${id}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to sync bank account: ${errorText}`);
      }

      // Fetch updated accounts
      fetchAccounts();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Bank Accounts</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Add Bank Account
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
            {accounts.length === 0 ? (
              <div className="px-4 py-5 text-center text-gray-500">
                No bank accounts found. Add a bank account to get started.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {accounts.map((account) => (
                  <li key={account.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-gray-900">
                            {account.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} •
                            {account.provider === 'gocardless' ? ' GoCardless' : ' SimpleFIN Bridge'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Last synced: {formatDate(account.last_synced)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleSync(account.id)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Sync
                          </button>
                          <button
                            onClick={() => handleEdit(account)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Add Bank Account Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add Bank Account</h2>
              <form onSubmit={handleAddSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Account Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., My Checking Account"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="account_type" className="block text-sm font-medium text-gray-700">
                    Account Type
                  </label>
                  <select
                    id="account_type"
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit Card</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                    Provider
                  </label>
                  <select
                    id="provider"
                    name="provider"
                    value={formData.provider}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="gocardless">GoCardless (EU Banks)</option>
                    <option value="coinconductor">SimpleFIN Bridge</option>
                  </select>
                </div>

                {formData.provider === 'gocardless' && (
                  <>
                    <div className="mb-4">
                      <label htmlFor="secret_id" className="block text-sm font-medium text-gray-700">
                        Secret ID
                      </label>
                      <input
                        type="text"
                        id="secret_id"
                        name="secret_id"
                        value={formData.secret_id}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="secret_key" className="block text-sm font-medium text-gray-700">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        id="secret_key"
                        name="secret_key"
                        value={formData.secret_key}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </>
                )}

                {formData.provider === 'coinconductor' && (
                  <div className="mb-4">
                    <label htmlFor="secret_id" className="block text-sm font-medium text-gray-700">
                      SimpleFIN Access URL
                    </label>
                    <input
                      type="text"
                      id="secret_id"
                      name="secret_id"
                      value={formData.secret_id}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="https://beta.coinconductor.org/access/..."
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Bank Account Modal */}
        {showEditForm && selectedAccount && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Bank Account</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                    Account Name
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-account_type" className="block text-sm font-medium text-gray-700">
                    Account Type
                  </label>
                  <select
                    id="edit-account_type"
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit Card</option>
                  </select>
                </div>

                {formData.provider === 'gocardless' && (
                  <>
                    <div className="mb-4">
                      <label htmlFor="edit-secret_id" className="block text-sm font-medium text-gray-700">
                        Secret ID
                      </label>
                      <input
                        type="text"
                        id="edit-secret_id"
                        name="secret_id"
                        value={formData.secret_id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="Leave blank to keep current value"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="edit-secret_key" className="block text-sm font-medium text-gray-700">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        id="edit-secret_key"
                        name="secret_key"
                        value={formData.secret_key}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="Leave blank to keep current value"
                      />
                    </div>
                  </>
                )}

                {formData.provider === 'coinconductor' && (
                  <div className="mb-4">
                    <label htmlFor="edit-secret_id" className="block text-sm font-medium text-gray-700">
                      SimpleFIN Access URL
                    </label>
                    <input
                      type="text"
                      id="edit-secret_id"
                      name="secret_id"
                      value={formData.secret_id}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Leave blank to keep current value"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedAccount(null);
                    }}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}