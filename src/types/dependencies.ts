import { NpmPackage } from '../lib/npm';

export interface PackageInfo {
    name: string;
    version: string;
    description: string;
    repository?: string;
    author?: string;
    license?: string;
}

export interface DependencyInfo {
    name: string;
    version: string;
    type: 'runtime' | 'dev' | 'peer' | 'optional';
}

export interface RepositoryDependencies {
    package: PackageInfo;
    dependencies: DependencyInfo[];
    devDependencies: DependencyInfo[];
    internalDependencies: DependencyInfo[];
    dependents: string[]; // packages that depend on this one
    repositoryPath: string; // full path to repository for unique identification
}

// New interfaces for npm-based dependency tracking
export interface NpmScopeDependencies {
    scope: string;
    packages: NpmPackage[];
    identityId: string; // which identity this scope belongs to
}

export interface NpmDependencyRelation {
    from: string; // package name
    to: string; // package name
    version: string;
    type: 'npm' | 'local'; // whether this is between npm packages or local packages
    fromScope?: string;
    toScope?: string;
}

export interface EnhancedDependencyGraph {
    // Existing local repository data
    repositories: RepositoryDependencies[];
    organizations: {
        [orgName: string]: string[]; // org name -> package names
    };
    interdependencies: {
        from: string;
        to: string;
        version: string;
    }[];

    // New npm-based data
    npmScopes: NpmScopeDependencies[];
    npmPackages: NpmPackage[]; // all npm packages from all scopes
    npmOrganizations: {
        [scopeName: string]: string[]; // scope name -> package names
    };
    npmDependencies: NpmDependencyRelation[]; // dependencies between npm packages
    crossDependencies: NpmDependencyRelation[]; // dependencies between local and npm packages
}

// Legacy interface for backward compatibility
export interface DependencyGraph {
    repositories: RepositoryDependencies[];
    organizations: {
        [orgName: string]: string[]; // org name -> package names
    };
    interdependencies: {
        from: string;
        to: string;
        version: string;
    }[];
} 