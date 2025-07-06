import { NextResponse } from 'next/server';
import { loadConfigFromDirectory } from '../../../../lib/config';
import { GitHubClient } from '../../../../lib/github';

export async function GET() {
    try {
        // Load configuration
        const config = await loadConfigFromDirectory();

        // Initialize GitHub client
        const githubClient = new GitHubClient(config);

        // Get all identities
        const identitiesResult = await githubClient.getAllIdentities();

        if (!identitiesResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to fetch identities',
                    details: identitiesResult.error
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            identities: identitiesResult.data || {},
            count: Object.keys(identitiesResult.data || {}).length
        });

    } catch (error) {
        console.error('Error fetching identities:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch identities',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 