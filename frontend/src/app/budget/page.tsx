'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';

interface Allocation {
  id: number;
  allocated_amount: number;
  category_id: number;
  category_name: string;
  spent: number;
  remaining: number;
}

interface BudgetPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_income: number;
  allocations: Allocation[];
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  unallocated: number;
}

interface Category {
  id: number;
  name: string;
}

export default function Budget() {
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<BudgetPeriod | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddPeriodForm, setShowAddPeriodForm] = useState(false);
  const [showAddAllocationForm, setShowAddAllocationForm] = useState(false);
  const [showEditIncomeForm, setShowEditIncomeForm] = useState(false);
  
  const [periodFormData, setPeriodFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    total_income: 0,
  });
  
  const [allocationFormData, setAllocationFormData] = useState({
    category_id: '',
    allocated_amount: 0,
  });
  
  const [incomeFormData, setIncomeFormData] = useState({
    total_income: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchBudgetPeriods();
  }, []);

  const fetchBudgetPeriods = async () => {
    setIsLoading(true);
    setError('');

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
      
      // Fetch current period details
      fetchCurrentPeriod();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const fetchCurrentPeriod = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/api/budget/periods/current/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 404) {
        // No budget periods exist yet
        setCurrentPeriod(null);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch current budget period');
      }

      const data = await response.json();
      setCurrentPeriod(data);
      
      // Set income form data
      setIncomeFormData({
        total_income: data.total_income,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBudgetPeriod = async (periodId: number) => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/budget/periods/${periodId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budget period');
      }

      const data = await response.json();
      setCurrentPeriod(data);
      
      // Set income form data
      setIncomeFormData({
        total_income: data.total_income,
      });
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

  const handlePeriodInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPeriodFormData({
      ...periodFormData,
      [name]: name === 'total_income' ? parseFloat(value) || 0 : parseInt(value) || 0,
    });
  };

  const handleAllocationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAllocationFormData({
      ...allocationFormData,
      [name]: name === 'allocated_amount' ? parseFloat(value) || 0 : value,
    });
  };

  const handleIncomeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIncomeFormData({
      ...incomeFormData,
      [name]: parseFloat(value) || 0,
    });
  };

  const handleAddPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const { year, month, total_income } = periodFormData;
      
      const response = await fetch(`http://localhost:8000/api/budget/periods/create-monthly/?year=${year}&month=${month}&total_income=${total_income}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create budget period');
      }

      // Reset form and fetch updated periods
      setPeriodFormData({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        total_income: 0,
      });
      setShowAddPeriodForm(false);
      
      // Fetch the newly created period
      const data = await response.json();
      fetchBudgetPeriod(data.id);
      fetchBudgetPeriods();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleAddAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPeriod) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/budget/allocations/?budget_period_id=${currentPeriod.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          category_id: parseInt(allocationFormData.category_id),
          allocated_amount: allocationFormData.allocated_amount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create allocation');
      }

      // Reset form and fetch updated period
      setAllocationFormData({
        category_id: '',
        allocated_amount: 0,
      });
      setShowAddAllocationForm(false);
      fetchBudgetPeriod(currentPeriod.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleEditIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPeriod) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/budget/periods/${currentPeriod.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          total_income: incomeFormData.total_income,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update income');
      }

      // Reset form and fetch updated period
      setShowEditIncomeForm(false);
      fetchBudgetPeriod(currentPeriod.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handleDeleteAllocation = async (allocationId: number) => {
    if (!confirm('Are you sure you want to delete this allocation?') || !currentPeriod) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/budget/allocations/${allocationId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete allocation');
      }

      // Fetch updated period
      fetchBudgetPeriod(currentPeriod.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const periodId = parseInt(e.target.value);
    if (periodId) {
      fetchBudgetPeriod(periodId);
    }
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
      month: 'long',
      day: 'numeric',
    });
  };

  const getProgressColor = (spent: number, allocated: number) => {
    if (allocated === 0) return 'bg-gray-300';
    
    const percentage = (spent / allocated) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Monthly Budget</h1>
          <div className="space-x-4">
            <button
              onClick={() => setShowAddPeriodForm(true)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              New Budget Period
            </button>
          </div>
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
          <>
            {/* Period Selector */}
            {budgetPeriods.length > 0 && (
              <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                <div className="md:grid md:grid-cols-3 md:gap-6">
                  <div className="md:col-span-1">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Budget Period</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select a budget period to view and manage.
                    </p>
                  </div>
                  <div className="mt-5 md:mt-0 md:col-span-2">
                    <select
                      value={currentPeriod?.id || ''}
                      onChange={handlePeriodChange}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                      {budgetPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name} ({formatDate(period.start_date)} - {formatDate(period.end_date)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Current Period Details */}
            {currentPeriod ? (
              <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{currentPeriod.name}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      {formatDate(currentPeriod.start_date)} - {formatDate(currentPeriod.end_date)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEditIncomeForm(true)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Edit Income
                  </button>
                </div>
                
                {/* Budget Summary */}
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-4">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Total Income</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatCurrency(currentPeriod.total_income)}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Allocated</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatCurrency(currentPeriod.total_allocated)}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Spent</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatCurrency(currentPeriod.total_spent)}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Unallocated</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatCurrency(currentPeriod.unallocated)}</dd>
                    </div>
                  </dl>
                </div>
                
                {/* Allocations */}
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Envelope Allocations</h3>
                    <button
                      onClick={() => setShowAddAllocationForm(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Add Allocation
                    </button>
                  </div>
                  
                  {currentPeriod.allocations.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No allocations yet. Add an allocation to get started.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {currentPeriod.allocations.map((allocation) => (
                        <li key={allocation.id} className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-900">
                                {allocation.category_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatCurrency(allocation.spent)} of {formatCurrency(allocation.allocated_amount)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">
                                {formatCurrency(allocation.remaining)} remaining
                              </span>
                              <button
                                onClick={() => handleDeleteAllocation(allocation.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${getProgressColor(
                                allocation.spent,
                                allocation.allocated_amount
                              )}`}
                              style={{
                                width: `${Math.min(
                                  (allocation.spent / allocation.allocated_amount) * 100,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 text-center">
                <p className="text-gray-500">No budget periods found. Create a new budget period to get started.</p>
              </div>
            )}
          </>
        )}

        {/* Add Budget Period Modal */}
        {showAddPeriodForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Budget Period</h2>
              <form onSubmit={handleAddPeriodSubmit}>
                <div className="mb-4">
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                    Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    name="year"
                    value={periodFormData.year}
                    onChange={handlePeriodInputChange}
                    required
                    min="2000"
                    max="2100"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                    Month
                  </label>
                  <select
                    id="month"
                    name="month"
                    value={periodFormData.month}
                    onChange={handlePeriodInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="total_income" className="block text-sm font-medium text-gray-700">
                    Total Income
                  </label>
                  <input
                    type="number"
                    id="total_income"
                    name="total_income"
                    value={periodFormData.total_income}
                    onChange={handlePeriodInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPeriodForm(false)}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Allocation Modal */}
        {showAddAllocationForm && currentPeriod && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add Envelope Allocation</h2>
              <form onSubmit={handleAddAllocationSubmit}>
                <div className="mb-4">
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={allocationFormData.category_id}
                    onChange={handleAllocationInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="allocated_amount" className="block text-sm font-medium text-gray-700">
                    Allocated Amount
                  </label>
                  <input
                    type="number"
                    id="allocated_amount"
                    name="allocated_amount"
                    value={allocationFormData.allocated_amount}
                    onChange={handleAllocationInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAllocationForm(false)}
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

        {/* Edit Income Modal */}
        {showEditIncomeForm && currentPeriod && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Income</h2>
              <form onSubmit={handleEditIncomeSubmit}>
                <div className="mb-4">
                  <label htmlFor="total_income" className="block text-sm font-medium text-gray-700">
                    Total Income
                  </label>
                  <input
                    type="number"
                    id="total_income"
                    name="total_income"
                    value={incomeFormData.total_income}
                    onChange={handleIncomeInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditIncomeForm(false)}
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
