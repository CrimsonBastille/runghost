import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromDirectory } from '../../../../lib/config';
import { GitHubClient } from '../../../../lib/github';

export async function POST(req: NextRequest) {
    try {
        console.log('Starting database reset...');

        // Load configuration
        const config = await loadConfigFromDirectory();

        // Initialize GitHub client
        const githubClient = new GitHubClient(config);

        // Reset the database completely
        await githubClient.resetDatabase();

        console.log('Database reset completed successfully');

        return NextResponse.json({
            success: true,
            message: 'Database reset successfully',
            details: 'Database file deleted and recreated with fresh schema'
        });

    } catch (error) {
        console.error('Error resetting database:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to reset database',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 