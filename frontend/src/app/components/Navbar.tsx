'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-primary-700' : '';
  };

  return (
    <nav className="bg-primary-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-xl font-bold">
                CoinConductor
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/dashboard')} hover:bg-primary-700`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/categories"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/categories')} hover:bg-primary-700`}
                >
                  Categories
                </Link>
                <Link
                  href="/transactions"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/transactions')} hover:bg-primary-700`}
                >
                  Transactions
                </Link>
                <Link
                  href="/accounts"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/accounts')} hover:bg-primary-700`}
                >
                  Bank Accounts
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <Link
                href="/profile"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/profile')} hover:bg-primary-700`}
              >
                Profile
              </Link>
              <button
                className="ml-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                onClick={() => {
                  // Handle logout
                  console.log('Logout clicked');
                }}
              >
                Logout
              </button>
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-primary-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard')} hover:bg-primary-700`}
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/categories"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/categories')} hover:bg-primary-700`}
              onClick={() => setIsOpen(false)}
            >
              Categories
            </Link>
            <Link
              href="/transactions"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/transactions')} hover:bg-primary-700`}
              onClick={() => setIsOpen(false)}
            >
              Transactions
            </Link>
            <Link
              href="/accounts"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/accounts')} hover:bg-primary-700`}
              onClick={() => setIsOpen(false)}
            >
              Bank Accounts
            </Link>
            <Link
              href="/profile"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/profile')} hover:bg-primary-700`}
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>
            <button
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-primary-700"
              onClick={() => {
                // Handle logout
                console.log('Logout clicked');
                setIsOpen(false);
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}