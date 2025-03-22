'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Category {
  id: number;
  name: string;
  budget_amount: number;
  spent: number;
  remaining: number;
  month: string;
}

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  category_id: number;
}

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState('');

  useEffect(() => {
    // Set current month in YYYY-MM format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthStr = `${year}-${month}`;
    setCurrentMonth(currentMonthStr);

    const fetchData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        // Fetch categories
        // Use the exact URL without relying on redirects
        const categoriesResponse = await fetch(`http://localhost:8000/api/categories/?month=${currentMonthStr}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
        });

        if (!categoriesResponse.ok) {
          throw new Error('Failed to fetch categories');
        }

        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Calculate totals
        let budgetTotal = 0;
        let spentTotal = 0;
        let remainingTotal = 0;

        categoriesData.forEach((category: Category) => {
          budgetTotal += category.budget_amount;
          spentTotal += category.spent;
          remainingTotal += category.remaining;
        });

        setTotalBudget(budgetTotal);
        setTotalSpent(spentTotal);
        setTotalRemaining(remainingTotal);

        // Fetch transactions for the current month
        // Use the exact URL without relying on redirects
        const transactionsResponse = await fetch(`http://localhost:8000/api/transactions/?month=${currentMonthStr}&limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
        });

        if (!transactionsResponse.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentMonth]);

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

  const getProgressColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Function to format month for display (e.g., "March 2025")
  const formatMonthDisplay = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } catch {
      return monthStr;
    }
  };

  // Function to get previous month in YYYY-MM format
  const getPreviousMonth = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-').map(Number);
      const date = new Date(year, month - 1, 1); // month is 0-indexed in Date
      date.setMonth(date.getMonth() - 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return monthStr;
    }
  };

  // Function to get next month in YYYY-MM format
  const getNextMonth = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-').map(Number);
      const date = new Date(year, month - 1, 1); // month is 0-indexed in Date
      date.setMonth(date.getMonth() + 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return monthStr;
    }
  };

  // Handle month change
  const handleMonthChange = (newMonth: string) => {
    setCurrentMonth(newMonth);
  };

  // Handle income update
  const handleIncomeUpdate = async (amount: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get the current budget period
      const periodResponse = await fetch(`http://localhost:8000/api/budget/periods/month/?year=${currentMonth.split('-')[0]}&month=${currentMonth.split('-')[1]}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!periodResponse.ok) {
        throw new Error('Failed to fetch budget period');
      }

      const periodData = await periodResponse.json();
      
      // Update the income for the period
      const updateResponse = await fetch(`http://localhost:8000/api/budget/periods/${periodData.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          total_income: amount
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update income');
      }

      // Refresh data
      window.location.reload();
    } catch (err) {
      console.error('Error updating income:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800">{formatMonthDisplay(currentMonth)}</h1>
        </div>
        <nav className="mt-6">
          <ul>
            <li className="px-6 py-3 text-xl font-medium">
              <Link href="/categories" className="text-gray-800 hover:text-primary-600">
                Categories
              </Link>
            </li>
            <li className="px-6 py-3 text-xl font-medium">
              <Link href="/transactions" className="text-gray-800 hover:text-primary-600">
                Transactions
              </Link>
            </li>
            <li className="px-6 py-3 text-xl font-medium">
              <Link href="/accounts" className="text-gray-800 hover:text-primary-600">
                Bank Accounts
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => handleMonthChange(getPreviousMonth(currentMonth))}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={() => handleMonthChange(getNextMonth(currentMonth))}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        
        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            {error}
          </div>
        ) : (
          <>
            {/* Income Entry Section */}
            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Monthly Income</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Set your monthly income to allocate to categories.</p>
                </div>
                <form 
                  className="mt-5 sm:flex sm:items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const income = parseFloat(formData.get('income') as string);
                    if (!isNaN(income)) {
                      handleIncomeUpdate(income);
                    }
                  }}
                >
                  <div className="w-full sm:max-w-xs">
                    <label htmlFor="income" className="sr-only">Income Amount</label>
                    <input
                      type="number"
                      name="income"
                      id="income"
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Update Income
                  </button>
                </form>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Budget
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {formatCurrency(totalBudget)}
                  </dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Spent
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {formatCurrency(totalSpent)}
                  </dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Remaining
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {formatCurrency(totalRemaining)}
                  </dd>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="mt-8">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Categories</h2>
                <Link
                  href="/categories"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  View all
                </Link>
              </div>
              <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
                {categories.length === 0 ? (
                  <div className="px-4 py-5 text-center text-gray-500">
                    No categories found. <Link href="/categories" className="text-primary-600 hover:text-primary-500">Create one</Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {category.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatCurrency(category.spent)} of {formatCurrency(category.budget_amount)}
                              </p>
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatCurrency(category.remaining)} remaining
                            </div>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${getProgressColor(
                                category.spent,
                                category.budget_amount
                              )}`}
                              style={{
                                width: `${Math.min(
                                  (category.spent / category.budget_amount) * 100,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Transactions */}
            <div className="mt-8">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Transactions</h2>
                <Link
                  href="/transactions"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  View all
                </Link>
              </div>
              
              {/* Unassigned Transactions */}
              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-700">Unassigned Transactions</h3>
                <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
                  {recentTransactions.filter(t => t.category_id === null || t.category_id === 0).length === 0 ? (
                    <div className="px-4 py-5 text-center text-gray-500">
                      No unassigned transactions.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {recentTransactions
                        .filter(t => t.category_id === null || t.category_id === 0)
                        .map((transaction) => (
                          <li key={transaction.id}>
                            <div className="px-4 py-4 sm:px-6">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {transaction.description}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatDate(transaction.date)}
                                  </p>
                                </div>
                                <div className={`text-sm font-medium ${
                                  transaction.amount < 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
              
              {/* Group transactions by category */}
              {categories.map(category => {
                const categoryTransactions = recentTransactions.filter(t => t.category_id === category.id);
                if (categoryTransactions.length === 0) return null;
                
                return (
                  <div key={category.id} className="mt-4">
                    <h3 className="text-md font-medium text-gray-700">{category.name}</h3>
                    <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {categoryTransactions.map((transaction) => (
                          <li key={transaction.id}>
                            <div className="px-4 py-4 sm:px-6">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {transaction.description}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatDate(transaction.date)}
                                  </p>
                                </div>
                                <div className={`text-sm font-medium ${
                                  transaction.amount < 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
