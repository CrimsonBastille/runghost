'use client';

import { useState } from 'react';

interface ResetResult {
    success: boolean;
    message?: string;
    details?: string;
    error?: string;
}

export function DatabaseResetButton() {
    const [isResetting, setIsResetting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [lastResetResult, setLastResetResult] = useState<ResetResult | null>(null);

    const handleReset = async () => {
        setIsResetting(true);
        setLastResetResult(null);
        setShowConfirmation(false);

        try {
            const response = await fetch('/api/database/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result: ResetResult = await response.json();
            setLastResetResult(result);

            if (result.success) {
                // Refresh the page after a short delay to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            setLastResetResult({
                success: false,
                error: 'Failed to reset database',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-destructive">Reset Database</h3>
                    <p className="text-sm text-muted-foreground">
                        ⚠️ This will delete the entire database and start fresh
                    </p>
                </div>
                <button
                    onClick={() => setShowConfirmation(true)}
                    disabled={isResetting}
                    className={`px-4 py-2 rounded font-medium transition-colors ${isResetting
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                >
                    {isResetting ? 'Resetting...' : 'Reset Database'}
                </button>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center mb-4">
                            <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-red-600">Confirm Database Reset</h3>
                        </div>
                        <div className="mb-6">
                            <p className="text-sm text-gray-700 mb-3">
                                <strong>This action will:</strong>
                            </p>
                            <ul className="text-sm text-gray-600 space-y-1 mb-4">
                                <li>• Delete the entire database file</li>
                                <li>• Remove all cached GitHub data</li>
                                <li>• Remove all dependency data</li>
                                <li>• Create a fresh empty database</li>
                            </ul>
                            <p className="text-sm text-red-600 font-medium">
                                This cannot be undone. Are you sure you want to continue?
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Yes, Reset Database
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Display */}
            {lastResetResult && (
                <div className={`p-4 rounded-lg border ${lastResetResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center space-x-2">
                        {lastResetResult.success ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span className={`font-medium ${lastResetResult.success ? 'text-green-800' : 'text-red-800'
                            }`}>
                            {lastResetResult.success ? 'Database Reset Successful' : 'Reset Failed'}
                        </span>
                    </div>

                    <p className={`mt-2 text-sm ${lastResetResult.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {lastResetResult.message || lastResetResult.error}
                    </p>

                    {lastResetResult.details && (
                        <p className="mt-1 text-sm text-gray-600">
                            {lastResetResult.details}
                        </p>
                    )}

                    {lastResetResult.success && (
                        <p className="mt-2 text-sm text-green-600">
                            The page will refresh automatically in 2 seconds...
                        </p>
                    )}
                </div>
            )}
        </div>
    );
} 