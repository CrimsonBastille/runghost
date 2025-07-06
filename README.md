# RunGhost

A unified dashboard for monitoring multiple GitHub identities from a single interface.

## Features

- **Multi-Identity Management**: Monitor multiple GitHub accounts from one dashboard
- **Hierarchical Configuration**: Uses CardiganTime for flexible configuration management
- **Local Caching**: Intelligent caching to minimize GitHub API calls
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS
- **CLI Interface**: Easy-to-use command-line interface for setup and management
- **Real-time Data**: Live updates of repositories, issues, releases, and statistics

## Installation

### Global Installation

```bash
npm install -g @nebulaglitch/runghost
```

### Local Installation

```bash
npm install @nebulaglitch/runghost
```

## Quick Start

### 1. Initialize Configuration

```bash
runghost init
```

This creates a `.runghost` directory with a sample configuration file.

### 2. Configure Your Identities

Edit `.runghost/config.yaml` to add your GitHub identities:

```yaml
port: 4000
host: localhost
dataDirectory: ~/.runghost
identities:
  personal:
    name: "Personal Account"
    username: "your-github-username"
    token: "ghp_your_personal_access_token"
    description: "My personal GitHub account"
    tags: ["personal", "primary"]
  
  work:
    name: "Work Account"
    username: "work-github-username"
    token: "ghp_your_work_access_token"
    description: "Work-related projects"
    tags: ["work", "professional"]
```

### 3. Start the Dashboard

```bash
runghost start
```

The dashboard will be available at `http://localhost:4000`

## Configuration

RunGhost uses hierarchical configuration with CardiganTime. Configuration files are searched in the following order:

1. Current directory: `./.runghost/config.yaml`
2. Parent directories (traversing up)
3. Home directory: `~/.runghost/config.yaml`

### Configuration Options

```yaml
# Server configuration
port: 4000                    # Port to run the server on
host: localhost               # Host to bind to

# Data storage
dataDirectory: ~/.runghost    # Directory for cached data
cacheTimeout: 300             # Cache timeout in seconds

# UI preferences
theme: auto                   # Theme: light, dark, auto
itemsPerPage: 20              # Items per page in lists
refreshInterval: 60           # Auto-refresh interval in seconds

# GitHub API configuration
github:
  userAgent: RunGhost/1.0.0   # User agent for API requests
  maxRetries: 3               # Maximum retry attempts
  retryDelay: 1000            # Delay between retries (ms)

# GitHub identities
identities:
  identity-id:
    name: "Display Name"
    username: "github-username"
    token: "ghp_token_here"
    description: "Optional description"
    avatar: "https://optional-custom-avatar.jpg"
    tags: ["tag1", "tag2"]

# Logging
verbose: false                # Enable verbose logging
debug: false                  # Enable debug logging
```

## GitHub Personal Access Tokens

To use RunGhost, you'll need GitHub Personal Access Tokens for each identity:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with the following permissions:
   - `repo` (for private repositories)
   - `read:user` (for user information)
   - `read:org` (for organization information)
3. Copy the token and add it to your configuration

## Commands

### `runghost start`
Start the RunGhost dashboard server.

### `runghost init`
Initialize RunGhost configuration in the current directory.

### `runghost config`
Display the current configuration.

### Command-line Options

```bash
runghost start --port 3000 --host 0.0.0.0 --verbose
```

- `--port, -p`: Port to run the server on
- `--host, -h`: Host to bind to
- `--data-dir`: Directory for cached data
- `--cache-timeout`: Cache timeout in seconds
- `--theme`: UI theme (light, dark, auto)
- `--verbose`: Enable verbose logging
- `--debug`: Enable debug logging

## Development

### Setup

```bash
git clone https://github.com/nebulaglitch/runghost.git
cd runghost
npm install
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## Architecture

RunGhost is built with:

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety throughout
- **Tailwind CSS**: Utility-first CSS framework
- **CardiganTime**: Hierarchical configuration management
- **Octokit**: GitHub API client
- **Zod**: Schema validation
- **Lucide React**: Icons

## Data Storage

RunGhost stores cached data in the configured data directory (default: `~/.runghost/`):

- `cache.json`: API response cache
- Configuration files as specified by CardiganTime

## Privacy & Security

- GitHub tokens are stored locally in your configuration files
- No data is sent to external servers except GitHub's API
- All data is cached locally to minimize API calls
- Tokens are never logged or displayed in the UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or contributions, please visit:
https://github.com/CrimsonBastille/runghost
