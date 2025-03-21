'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
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

        // Fetch recent transactions
        // Use the exact URL without relying on redirects
        const transactionsResponse = await fetch('http://localhost:8000/api/transactions/?limit=5', {
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

  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        
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

            {/* Recent Transactions */}
            <div className="mt-8">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
                <Link
                  href="/transactions"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  View all
                </Link>
              </div>
              <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
                {recentTransactions.length === 0 ? (
                  <div className="px-4 py-5 text-center text-gray-500">
                    No transactions found. <Link href="/transactions" className="text-primary-600 hover:text-primary-500">Add one</Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {recentTransactions.map((transaction) => (
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
          </>
        )}
      </div>
    </AuthLayout>
  );
}