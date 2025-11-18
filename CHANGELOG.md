# Changelog

## [1.0.0] - Initial Release

### Features
- ✨ AI-powered image editing with natural language prompts
- 🎨 Image generation from text descriptions
- 🖼️ Dark theme UI with modern design
- 📥 Image upload with validation
- 💾 One-click download functionality
- ⚡ Two modes: Edit and Generate

### Backend Improvements
- Removed unused imports (FormData)
- Added comprehensive input validation
- Implemented request timeout handling (120s)
- Added file type and size validation
- Improved error messages and logging
- Added health check endpoint with API status
- Structured error handling middleware
- Added constants for configuration
- Better API response handling

### Frontend Improvements
- Separated concerns into multiple files:
  - `api.ts` - API client functions
  - `types.ts` - TypeScript interfaces
  - `utils.ts` - Helper functions
- Added file validation before upload
- Improved error handling and user feedback
- Added API health check on startup
- Added character counter for prompts
- Added keyboard shortcuts (Ctrl/Cmd + Enter)
- Better loading states and disabled states
- Improved TypeScript type safety
- Added warning messages for API configuration

### Code Quality
- Full TypeScript type coverage
- Separated business logic from UI
- Reusable utility functions
- Better error propagation
- Consistent code style
- Comprehensive validation

### Security
- File type validation (JPEG, PNG, WebP only)
- File size limits (50MB max)
- Input sanitization
- Prompt length limits (2000 chars)
- Dimension validation for generated images

### Documentation
- Comprehensive README.md
- Quick setup guide (SETUP.md)
- API endpoint documentation
- Troubleshooting section

