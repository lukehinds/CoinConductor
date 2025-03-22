'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  category_id: number | null;
  category_name: string;
  budget_period_id: number | null;
  notes?: string;
  source: string;
}

interface Category {
  id: number;
  name: string;
}

interface BudgetPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: 'outgoing',
    amount: 0,
    description: '',
    date: '',
    is_recurring: false,
    category_id: '',
    budget_period_id: '',
    notes: '',
  });
  const [filters, setFilters] = useState({
    category_id: '',
    budget_period_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchBudgetPeriods();
    fetchTransactions();
  }, []);

  const fetchBudgetPeriods = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/api/budget/periods/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budget periods');
      }

      const data = await response.json();
      setBudgetPeriods(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.category_id) queryParams.append('category_id', filters.category_id);
      if (filters.budget_period_id) queryParams.append('budget_period_id', filters.budget_period_id);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      // Use the exact URL without relying on redirects
      const response = await fetch(`http://localhost:8000/api/transactions/?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();

      // Use category_name from backend response, fallback to finding it in categories if not present
      const transactionsWithCategoryNames = data.map((transaction: Transaction) => {
        if (transaction.category_name) {
          return transaction;
        }
        const category = categories.find(c => c.id === transaction.category_id);
        return {
          ...transaction,
          category_name: category ? category.name : 'Uncategorized'
        };
      });

      setTransactions(transactionsWithCategoryNames);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Use the exact URL without relying on redirects
      const response = await fetch('http://localhost:8000/api/categories/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
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

      // Ensure date is properly formatted as ISO string
      const formattedData = {
        ...formData,
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        source: 'manual',
        category_id: formData.category_id === "" ? null : Number(formData.category_id),
        budget_period_id: formData.budget_period_id === "" ? null : Number(formData.budget_period_id),
      };

      console.log('Sending transaction data:', formattedData);

      const response = await fetch('http://localhost:8000/api/transactions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to create transaction: ${errorText}`);
      }

      // Reset form and fetch updated transactions
      setFormData({
        type: 'outgoing',
        amount: 0,
        description: '',
        date: '',
        is_recurring: false,
        category_id: '',
        budget_period_id: '',
        notes: '',
      });
      setShowAddForm(false);
      fetchTransactions();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTransaction) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Ensure date is properly formatted as ISO string
      const formattedData = {
        ...formData,
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        category_id: formData.category_id === "" ? null : Number(formData.category_id),
        budget_period_id: formData.budget_period_id === "" ? null : Number(formData.budget_period_id),
      };

      console.log('Sending updated transaction data:', formattedData);

      const response = await fetch(`http://localhost:8000/api/transactions/${selectedTransaction.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to update transaction: ${errorText}`);
      }

      // Reset form and fetch updated transactions
      setFormData({
        type: 'outgoing',
        amount: 0,
        description: '',
        date: '',
        is_recurring: false,
        category_id: '',
        budget_period_id: '',
        notes: '',
      });
      setSelectedTransaction(null);
      setShowEditForm(false);
      fetchTransactions();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/transactions/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to delete transaction: ${errorText}`);
      }

      // Fetch updated transactions
      fetchTransactions();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.amount < 0 ? 'incoming' : 'outgoing',
      amount: transaction.amount,
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0],
      is_recurring: false, // Default to false since we don't have this info in the transaction
      category_id: transaction.category_id ? transaction.category_id.toString() : '',
      budget_period_id: transaction.budget_period_id ? transaction.budget_period_id.toString() : '',
      notes: transaction.notes || '',
    });
    setShowEditForm(true);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setFilters({
      category_id: '',
      budget_period_id: '',
      start_date: '',
      end_date: '',
    });
    // Fetch transactions without filters
    fetchTransactions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleBulkCategorize = async () => {
    setIsCategorizing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/api/ai/bulk-categorize/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to bulk categorize transactions');
      }

      const data = await response.json();
      console.log('Bulk categorization results:', data);
      
      // Refresh transactions to show new categories
      await fetchTransactions();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsCategorizing(false);
    }
  };

  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <div className="space-x-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Transaction
            </button>
            <button
              onClick={handleBulkCategorize}
              disabled={isCategorizing}
              className={`${
                isCategorizing ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-700'
              } text-white font-bold py-2 px-4 rounded`}
            >
              {isCategorizing ? 'Categorizing...' : 'AI Bulk Categorize'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Filters</h3>
              <p className="mt-1 text-sm text-gray-500">
                Filter transactions by category, date range, or both.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <form onSubmit={handleApplyFilters}>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={filters.category_id}
                      onChange={handleFilterChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="budget_period_id" className="block text-sm font-medium text-gray-700">
                      Budget Period
                    </label>
                    <select
                      id="budget_period_id"
                      name="budget_period_id"
                      value={filters.budget_period_id}
                      onChange={handleFilterChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">All Budget Periods</option>
                      {budgetPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      id="start_date"
                      value={filters.start_date}
                      onChange={handleFilterChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      id="end_date"
                      value={filters.end_date}
                      onChange={handleFilterChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Apply Filters
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
            {transactions.length === 0 ? (
              <div className="px-4 py-5 text-center text-gray-500">
                No transactions found. Add a transaction to get started.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Budget Period
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {budgetPeriods.find(p => p.id === transaction.budget_period_id)?.name || 'None'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span
                          className={
                            transaction.amount < 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Add Transaction Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add Transaction</h2>
              <form onSubmit={handleAddSubmit}>
                <div className="mb-4">
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={Math.abs(formData.amount)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      // Set amount based on transaction type
                      const amount = formData.type === 'incoming' ? -value : value;
                      setFormData({
                        ...formData,
                        amount: amount
                      });
                    }}
                    required
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_recurring"
                        name="is_recurring"
                        checked={formData.is_recurring}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            is_recurring: e.target.checked
                          });
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700">
                        Recurring
                      </label>
                    </div>
                  </div>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="budget_period_id" className="block text-sm font-medium text-gray-700">
                    Budget Period
                  </label>
                  <select
                    id="budget_period_id"
                    name="budget_period_id"
                    value={formData.budget_period_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">None</option>
                    {budgetPeriods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
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

        {/* Edit Transaction Modal */}
        {showEditForm && selectedTransaction && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Transaction</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    id="edit-type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <input
                    type="number"
                    id="edit-amount"
                    name="amount"
                    value={Math.abs(formData.amount)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      // Set amount based on transaction type
                      const amount = formData.type === 'incoming' ? -value : value;
                      setFormData({
                        ...formData,
                        amount: amount
                      });
                    }}
                    required
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit-is_recurring"
                        name="is_recurring"
                        checked={formData.is_recurring}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            is_recurring: e.target.checked
                          });
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit-is_recurring" className="ml-2 block text-sm text-gray-700">
                        Recurring
                      </label>
                    </div>
                  </div>
                  <input
                    type="date"
                    id="edit-date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-category_id" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="edit-category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-budget_period_id" className="block text-sm font-medium text-gray-700">
                    Budget Period
                  </label>
                  <select
                    id="edit-budget_period_id"
                    name="budget_period_id"
                    value={formData.budget_period_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">None</option>
                    {budgetPeriods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">
                    Notes (optional)
                  </label>
                  <textarea
                    id="edit-notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedTransaction(null);
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
