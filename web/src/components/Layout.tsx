import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, FileText, TreePine } from 'lucide-react';
import { clsx } from 'clsx';

interface LayoutProps {
    children: ReactNode;
}

const navigation = [
    { name: 'Sentiment Analysis', href: '/sentiment', icon: Brain },
    { name: 'Summarization', href: '/summarization', icon: FileText },
    { name: 'Word Tree', href: '/word-tree', icon: TreePine },
];

export function Layout({ children }: LayoutProps) {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-center border-b border-gray-200">
                        <h1 className="text-xl font-bold text-gray-900">Free-txt-vi</h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-4 py-4">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={clsx(
                                        'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    )}
                                >
                                    <item.icon
                                        className={clsx(
                                            'mr-3 h-5 w-5 flex-shrink-0',
                                            isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="pl-64">
                <main className="py-8">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
} 