'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Category {
  id: number;
  name: string;
  budget_amount: number;
  spent: number;
  remaining: number;
}

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  category_id: number;
  category_name: string;
}

export default function Demo() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      // Sample categories data
      const sampleCategories = [
        {
          id: 1,
          name: 'Groceries',
          budget_amount: 500,
          spent: 320.45,
          remaining: 179.55,
        },
        {
          id: 2,
          name: 'Rent',
          budget_amount: 1200,
          spent: 1200,
          remaining: 0,
        },
        {
          id: 3,
          name: 'Utilities',
          budget_amount: 200,
          spent: 150.75,
          remaining: 49.25,
        },
        {
          id: 4,
          name: 'Entertainment',
          budget_amount: 150,
          spent: 87.32,
          remaining: 62.68,
        },
        {
          id: 5,
          name: 'Dining Out',
          budget_amount: 300,
          spent: 275.89,
          remaining: 24.11,
        },
        {
          id: 6,
          name: 'Savings',
          budget_amount: 400,
          spent: 400,
          remaining: 0,
        },
      ];

      // Sample transactions data
      const sampleTransactions = [
        {
          id: 1,
          amount: 45.67,
          description: 'Grocery Store',
          date: '2025-03-15T12:00:00Z',
          category_id: 1,
          category_name: 'Groceries',
        },
        {
          id: 2,
          amount: 1200,
          description: 'Monthly Rent',
          date: '2025-03-01T12:00:00Z',
          category_id: 2,
          category_name: 'Rent',
        },
        {
          id: 3,
          amount: 85.43,
          description: 'Electric Bill',
          date: '2025-03-10T12:00:00Z',
          category_id: 3,
          category_name: 'Utilities',
        },
        {
          id: 4,
          amount: 32.50,
          description: 'Movie Tickets',
          date: '2025-03-12T12:00:00Z',
          category_id: 4,
          category_name: 'Entertainment',
        },
        {
          id: 5,
          amount: 65.32,
          description: 'Restaurant Dinner',
          date: '2025-03-14T12:00:00Z',
          category_id: 5,
          category_name: 'Dining Out',
        },
        {
          id: 6,
          amount: 400,
          description: 'Monthly Savings Transfer',
          date: '2025-03-05T12:00:00Z',
          category_id: 6,
          category_name: 'Savings',
        },
        {
          id: 7,
          amount: 120.45,
          description: 'Weekly Grocery Run',
          date: '2025-03-08T12:00:00Z',
          category_id: 1,
          category_name: 'Groceries',
        },
        {
          id: 8,
          amount: 65.32,
          description: 'Water Bill',
          date: '2025-03-11T12:00:00Z',
          category_id: 3,
          category_name: 'Utilities',
        },
        {
          id: 9,
          amount: 54.87,
          description: 'Takeout Dinner',
          date: '2025-03-13T12:00:00Z',
          category_id: 5,
          category_name: 'Dining Out',
        },
        {
          id: 10,
          amount: 154.33,
          description: 'Grocery Shopping',
          date: '2025-03-14T12:00:00Z',
          category_id: 1,
          category_name: 'Groceries',
        },
      ];

      // Calculate totals
      let budgetTotal = 0;
      let spentTotal = 0;
      let remainingTotal = 0;

      sampleCategories.forEach((category) => {
        budgetTotal += category.budget_amount;
        spentTotal += category.spent;
        remainingTotal += category.remaining;
      });

      setCategories(sampleCategories);
      setTransactions(sampleTransactions);
      setTotalBudget(budgetTotal);
      setTotalSpent(spentTotal);
      setTotalRemaining(remainingTotal);
      setIsLoading(false);
    }, 1000); // Simulate 1 second loading time
  }, []);

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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary-600 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">CoinConductor Demo</h1>
          <div className="flex space-x-4">
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-700 hover:bg-primary-800"
            >
              Register
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to CoinConductor Demo</h2>
            <p className="text-gray-600 mb-4">
              This is a demo of the CoinConductor personal budget application. You can explore the features
              and see how the envelope budgeting system works with sample data.
            </p>
            <p className="text-gray-600">
              To create your own budget and start tracking your finances, please{' '}
              <Link href="/register" className="text-primary-600 hover:text-primary-500">
                register for an account
              </Link>
              .
            </p>
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
          
          {isLoading ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
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
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Categories</h2>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {transactions.slice(0, 5).map((transaction) => (
                      <li key={transaction.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {transaction.description}
                              </p>
                              <div className="flex items-center">
                                <p className="text-sm text-gray-500 mr-2">
                                  {formatDate(transaction.date)}
                                </p>
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {transaction.category_name}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-red-600">
                              {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      <footer className="bg-white shadow mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} CoinConductor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}