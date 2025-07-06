import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromDirectory } from '../../../../lib/config';
import { GitHubClient } from '../../../../lib/github';

export async function POST(req: NextRequest) {
    try {
        console.log('Starting GitHub data refresh...');

        // Parse request body to check for specific identity
        const body = await req.json().catch(() => ({}));
        const specificIdentityId = body.identityId;

        // Load configuration
        const config = await loadConfigFromDirectory();

        // DEBUG: Log the identities being loaded
        console.log('DEBUG: Config identities:', Object.keys(config.identities));
        console.log('DEBUG: Total identities in config:', Object.keys(config.identities).length);
        if (specificIdentityId) {
            console.log('DEBUG: Refreshing specific identity:', specificIdentityId);
        }

        // Initialize GitHub client
        const githubClient = new GitHubClient(config);

        const refreshStats = {
            identities: 0,
            repositories: 0,
            releases: 0,
            issues: 0,
            pullRequests: 0,
            branches: 0,
            errors: [] as string[]
        };

        // Determine which identities to refresh
        const identitiesToRefresh = specificIdentityId
            ? [specificIdentityId]
            : Object.keys(config.identities);

        // Validate specific identity exists if provided
        if (specificIdentityId && !config.identities[specificIdentityId]) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Identity "${specificIdentityId}" not found in configuration`,
                    details: `Available identities: ${Object.keys(config.identities).join(', ')}`
                },
                { status: 400 }
            );
        }

        // Force refresh detailed data for specified identities
        for (const identityId of identitiesToRefresh) {
            console.log(`Force refreshing detailed data for identity: ${identityId}`);

            // Force refresh identity data to ensure we have the latest
            const identityResult = await githubClient.getIdentityData(identityId, true);
            if (!identityResult.success) {
                refreshStats.errors.push(`Failed to refresh identity ${identityId}: ${identityResult.error}`);
                continue;
            }

            const repositories = identityResult.data?.repositories || [];
            refreshStats.repositories += repositories.length;

            // Fetch detailed data for each repository
            for (const repo of repositories) {
                console.log(`Fetching detailed data for repository: ${identityId}/${repo.name}`);

                try {
                    const repoDetailResult = await githubClient.getRepositoryDetail(identityId, repo.name, true);

                    if (repoDetailResult.success && repoDetailResult.data) {
                        const detail = repoDetailResult.data;
                        refreshStats.releases += detail.releases.length;
                        refreshStats.issues += detail.issues.length;
                        refreshStats.pullRequests += detail.pullRequests.length;
                        refreshStats.branches += detail.branches.length;
                    } else {
                        refreshStats.errors.push(`Failed to fetch details for ${repo.name}: ${repoDetailResult.error}`);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    refreshStats.errors.push(`Error fetching ${repo.name}: ${errorMessage}`);
                }
            }
        }

        // Get final identity count from the refreshed data
        const identitiesResult = await githubClient.getAllIdentities();
        if (identitiesResult.success) {
            refreshStats.identities = Object.keys(identitiesResult.data || {}).length;
        }

        console.log('GitHub data refresh completed successfully');

        return NextResponse.json({
            success: true,
            message: specificIdentityId
                ? `GitHub data refreshed successfully for identity: ${specificIdentityId}`
                : 'GitHub data refreshed successfully for all identities',
            stats: refreshStats,
            refreshedIdentities: identitiesToRefresh,
            debug: {
                configIdentities: Object.keys(config.identities),
                configIdentitiesCount: Object.keys(config.identities).length,
                note: specificIdentityId
                    ? `Detailed repository data fetched for identity: ${specificIdentityId}`
                    : "Detailed repository data fetched for all configured identities"
            }
        });

    } catch (error) {
        console.error('Error during GitHub refresh:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to refresh GitHub data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 