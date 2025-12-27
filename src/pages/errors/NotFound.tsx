import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h1 className="text-9xl font-bold text-indigo-600">404</h1>
                <h2 className="mt-4 text-3xl font-extrabold text-gray-900 tracking-tight">Page not found</h2>
                <p className="mt-2 text-base text-gray-500">
                    Sorry, we couldn't find the page you're looking for.
                </p>
                <div className="mt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Go back
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="ml-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Go home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
