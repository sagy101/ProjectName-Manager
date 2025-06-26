# Contributing to ProjectName Manager

## Project Branch Strategy

This repository uses a multi-project branch strategy to support different organizations and their custom configurations.

### Branch Structure

#### Main Branch
- **`main`** - The core ProjectName Manager codebase
- Contains the base application code and default configurations
- All core feature development and bug fixes happen here
- Protected branch requiring PR approval for changes

#### Project-Specific Branches
Each organization using ProjectName Manager should create their own project branch:

- **`Project-{OrganizationName}`** - Custom configuration branch for each organization
- Examples: `Project-Isolation`, `Project-Acme`, `Project-TechCorp`
- Contains organization-specific configurations in JSON files
- **Protected branches** requiring PR approval for changes
- Should be forked from `main` or created as new branches

### Getting Started for New Projects

#### Option 1: Fork and Create Project Branch
1. Fork this repository to your organization
2. Create a new branch: `Project-{YourOrganizationName}`
3. Customize the configuration files:
   - `src/project-config/config/configurationSidebarSections.json`
   - `src/project-config/config/configurationSidebarCommands.json`
   - `src/project-config/config/configurationSidebarAbout.json`
   - `src/environment-verification/generalEnvironmentVerifications.json`
4. Set up branch protection rules for your project branch
5. Submit PRs to your project branch for configuration changes

#### Option 2: Request Project Branch in Main Repository
1. Contact the repository maintainers
2. Request creation of a `Project-{YourOrganizationName}` branch
3. Once created, submit PRs with your custom configurations
4. Branch protection will be enabled requiring approval for changes

### Configuration Customization

Project branches can customize:

#### Project Configuration
- **Sections**: Define which services/components are available
- **Commands**: Specify deployment and management commands
- **About Information**: Project-specific documentation and help text

#### Environment Verification
- **Custom Verifications**: Add organization-specific environment checks
- **Fix Commands**: Define automated fixes for common environment issues
- **Prerequisites**: Specify required tools and dependencies

### Development Workflow

#### For Core Features (affects all projects)
1. Create feature branch from `main`
2. Develop and test changes
3. Submit PR to `main` branch
4. After merge, project branches can pull updates from `main`

#### For Project-Specific Configuration
1. Create feature branch from your `Project-{Name}` branch
2. Modify configuration files as needed
3. Test changes with your project setup
4. Submit PR to your `Project-{Name}` branch
5. Require team approval before merging

#### Pulling Core Updates
Project branches should regularly pull updates from `main`:

```bash
# Switch to your project branch
git checkout Project-YourOrganization

# Pull latest changes from main
git pull origin main

# Resolve any merge conflicts with your configurations
# Test thoroughly before pushing
git push origin Project-YourOrganization
```

### Branch Protection Rules

#### Main Branch
- Require PR review before merging
- Require status checks to pass
- Require branches to be up to date before merging
- Restrict pushes to admins only

#### Project Branches
- Require PR review from project team members
- Require status checks to pass (if applicable)
- Restrict pushes to project maintainers
- Allow project-specific policies

### Configuration File Guidelines

When customizing configurations for your project:

#### Best Practices
- **Validate JSON**: Ensure all configuration files are valid JSON
- **Test Thoroughly**: Verify all commands work in your environment
- **Document Changes**: Include clear commit messages and PR descriptions
- **Backup Configurations**: Keep copies of working configurations

#### Required Fields
Each configuration file has required fields that must be maintained:
- Section IDs must be unique and follow naming conventions
- Command structures must match expected schema
- Verification IDs should be descriptive and unique

#### Security Considerations
- **No Sensitive Data**: Never commit passwords, tokens, or secrets
- **Environment Variables**: Use environment variables for sensitive configuration
- **Review Commands**: Carefully review all shell commands before approval
- **Sandbox Testing**: Test destructive commands in safe environments first

### Support and Communication

#### Getting Help
- Check existing documentation in the `docs/` folder
- Review existing project branches for examples
- Create issues for questions or problems
- Contact repository maintainers for access requests

#### Reporting Issues
- Use issue templates when available
- Include project branch information
- Provide clear reproduction steps
- Tag with appropriate labels

### Example Project Structure

```
Project-Isolation/                    # Your project branch
├── src/project-config/config/
│   ├── configurationSidebarSections.json    # Your project's services
│   ├── configurationSidebarCommands.json    # Your deployment commands
│   └── configurationSidebarAbout.json       # Your project documentation
├── src/environment-verification/
│   └── generalEnvironmentVerifications.json # Your environment checks
└── README.md                         # Project-specific readme (optional)
```

### Migration from Main

If you're migrating from using the main branch directly:

1. Create your project branch from current main
2. Copy your current configuration files to the branch
3. Set up branch protection
4. Update your deployment processes to use the project branch
5. Continue pulling core updates from main as needed

---

For questions about the contribution process or project branch setup, please create an issue or contact the repository maintainers. 