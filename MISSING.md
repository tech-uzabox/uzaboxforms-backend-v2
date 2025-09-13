# Missing API Endpoints - Migration Analysis

This document lists API endpoints from the old Express/Mongoose codebase that appear to be missing or changed in the new NestJS/PostgreSQL implementation.

## Authentication Endpoints

### Missing from `old_code/routes/auth.routes.ts`

1. **POST /validate/email**
   - **File**: `old_code/routes/auth.routes.ts`
   - **Purpose**: Validate user's email with OTP
   - **Status**: NOT FOUND in `src/auth/auth.controller.ts`
   - **Notes**: Used for email verification after registration

2. **POST /change-password**
   - **File**: `old_code/routes/auth.routes.ts`
   - **Purpose**: Change user password (authenticated)
   - **Status**: NOT FOUND in `src/auth/auth.controller.ts`
   - **Notes**: Requires JWT authentication, different from password reset

3. **GET /validate/token**
   - **File**: `old_code/routes/auth.routes.ts`
   - **Purpose**: Validate JWT token
   - **Status**: NOT FOUND in `src/auth/auth.controller.ts`
   - **Notes**: Endpoint for clients to verify token validity

4. **PUT /profile**
   - **File**: `old_code/routes/auth.routes.ts`
   - **Purpose**: Update user profile information
   - **Status**: NOT FOUND in `src/auth/auth.controller.ts` (GET /profile exists)
   - **Notes**: Only GET exists; PUT functionality is missing

5. **GET /google/failed**
   - **File**: `old_code/routes/auth.routes.ts`
   - **Purpose**: Google OAuth failure redirect
   - **Status**: NOT FOUND in `src/auth/auth.controller.ts`
   - **Notes**: Part of OAuth flow for handling failures

6. **GET /google/success**
   - **File**: `old_code/routes/auth.routes.ts`
   - **Purpose**: Google OAuth success redirect
   - **Status**: NOT FOUND in `src/auth/auth.controller.ts`
   - **Notes**: Part of OAuth flow for successful authentication

## OTP Routes

### Differences in `old_code/routes/otp.routes.ts`
- **Old**: `POST /send-otp`
- **New**: `POST /otp/generate` and `POST /otp/validate` in `src/otp/otp.controller.ts`
- **Gap**: Old may be missing explicit validation endpoint for email validation scenarios

### Form Fields Routes

#### Missing from `old_code/routes/form/form.fields.routes.ts`
- **Status**: NOT FOUND in new codebase
- **Endpoints**:
  - `GET /forms/:id/fields` - Get all fields for a specific form
  - `GET /forms/fields/multiple` - Get fields for multiple forms
- **Location**: Both endpoints missing from `src/form/form.controller.ts`

### File Upload Status Route

#### From `old_code/routes/upload.routes.ts`
- **Old**: `GET /upload/status/:id` - Check file processing job status
- **New**: File management endpoints exist in `src/files/files.controller.ts` but ↑ NO direct status endpoint
- **Gap**: The new file system uses different mechanisms (S3 + DB records) vs. Bull queues for status polling

### Dashboard Widget Order Route

#### From `old_code/routes/dashboard/dashboard.routes.ts`
- **Old**: `PUT /dashboards/:id/widget-order` - Update widget order for a dashboard
- **New**: Dashboard CRUD endpoints exist in `src/dashboard/dashboard.controller.ts` but ↑ NO widget-order endpoint
- **Gap**: Widget ordering functionality appears to be missing

### Incoming Applications Sendback Route

#### From `old_code/routes/process/incoming.process.routes.ts`
- **Old**: `PATCH /pending-processes/sendback/:applicantProcessId` - Send form back for revision
- **New**: Incoming application endpoints exist in `src/incoming-application/incoming-application.controller.ts` but ↑ NO sendback endpoint
- **Gap**: Process sendback/reversion functionality appears to be missing

### Widget Management System

#### From `old_code/routes/widget/widget.routes.ts` - COMPLETE SYSTEM MISSING
- **Status**: SEVERELY IMPACTED - New controller is empty!
- **Old Routes**: 9 comprehensive widget management endpoints
  - `GET /widgets` - List widgets with filtering
  - `POST /widgets` - Create widget
  - `POST /widgets/bulk-refresh` - Bulk data refresh
  - `POST /widgets/duplicate` - Duplicate widget
  - `GET /widgets/:id` - Get widget config
  - `PUT /widgets/:id` - Update widget
  - `PUT /widgets/:id/access` - Update access control
  - `DELETE /widgets/:id` - Delete widget
  - `GET /widgets/:id/data` - Get visualization data
- **New Status**: `src/widget/widget.controller.ts` is **COMPLETELY EMPTY**
- **Impact**: All dashboard widget functionality is missing - critical for data visualization

### Process Form Management Routes

#### From `old_code/routes/process/process.form.routes.ts` - MULTIPLE ENDPOINTS MISSING
- **Status**: MISSING multiple process form management endpoints
- **Missing Endpoints**:
  - `GET /process-forms` - Get all process forms
  - `GET /process-forms/:processId` - Get forms by process ID
  - `GET /process-forms/:processId/:userId` - Get forms by process and user ID
  - `GET /process-form/:processId/:formId` - Get specific process form
- **Available**: Only `POST /processes/submit-form/:processId` exists (different route structure)
- **Impact**: Process form retrieval and management capabilities are missing

### Analytics Route Name Changes

#### Route Path Changes (old_code/routes/analytics/analytics.general.routes.ts & analytics.form.routes.ts)
- **Old** `/analytics/form/:processId/:formId` → **New** `/analytics/form/:processId/:formId` ✓ SAME
- **Old** `/analytics/general/applications_rate` → **New** `/analytics/applications` (function name change only)
- **Old** `/analytics/general/form_activity` → **New** `/analytics/form-responses` (function name change only)
- **Old** `/analytics/general/applications_per_process` → **New** `/analytics/monthly-applicant-processes-count` (same function)
- **Old** `/analytics/general/application_distribution_per_process` → **New** `/analytics/process-distribution` (same function)
- **Status**: FUNCTION NAMES changed but routes are equivalent

## File Upload Routes

### From `old_code/routes/upload.routes.ts`
- **Status**: NEEDS VERIFICATION
- **Endpoints**:
  - `POST /upload` (with multer, authenticated)
  - `GET /upload/status/:id` (authenticated)
- **Location**: Likely handled by `src/files/files.controller.ts` or `src/file/file.controller.ts`
- **Notes**: Requires checking file handling implementation

## Form Routes

### From `old_code/routes/form/` directory (6 files)
**Status**: NEEDS VERIFICATION
- `form.addToDatabase.routes.ts` → `src/add-to-database/`
- `form.countries.routes.ts` → `GET /forms/with-countries` (NEEDS VERIFICATION)
- `form.design.routes.ts` → `src/form/`
- `form.fields.routes.ts` → `GET /forms/:id/fields` (NEEDS VERIFICATION)
- `form.name.routes.ts` → `src/form/`
- `form.response.routes.ts` → `src/form-response/`

## Process Routes

### From `old_code/routes/process/` directory (8 files)
**Status**: NEEDS VERIFICATION
- Workflow-related endpoints may have changed routing patterns

## Dashboard Routes

### From `old_code/routes/dashboard/dashboard.routes.ts`
**Status**: NEEDS VERIFICATION
- `GET /dashboards`
- `GET /dashboards/:id/widgets`

## Analytics Routes

### From `old_code/routes/analytics/` directory (2 files)
- **Old**: `GET /analytics/form/:processId/:formId` ✓ EXISTS in `src/analytics/analytics.controller.ts`
- **Old**: `analytics.general.routes.ts` → Multiple endpoints

## Organization Routes

### From `old_code/routes/organization/` directory (2 files)
- `organization.user.routes.ts`
- `organization.routes.ts`

## Widget Routes

### From `old_code/routes/widget/widget.routes.ts`
- Dashboard widget management endpoints

## Management Routes

### From `old_code/routes/management/management.routes.ts`
- Image/header/footer management

## QR Code Routes

### From `old_code/routes/qr-code/document.qrcode.routes.ts`
- Document QR code management

## Reporting Routes

### From `old_code/routes/reporting/reporting.routes.ts`
- Report generation endpoints

## User Routes

### From `old_code/routes/user/` directory (2 files)
- User management: `user.routes.ts`, `user.role.routes.ts`

## Key Observations

1. **Route Pattern Changes**: Many endpoints exist but may have different HTTP methods (e.g., PATCH vs PUT) or consolidated routes
2. **Controller Consolidation**: Old Express approach had many separate route files; new NestJS may have consolidated them
3. **Middleware Changes**: Authentication guards and middleware have evolved (e.g., NestJS guards vs Express middleware)
4. **Error Handling**: Global error handling differs between frameworks

## Analysis Limitations

This analysis is based on a sample check of key route files. A complete verification would require examining every single route file and comparing with equivalent controllers in the new codebase. Some endpoints may exist with different names or have been integrated into other modules.

## Recommendation

For critical missing endpoints like `/validate/email`, `/change-password`, and `/validate/token`, these should be implemented as they provide essential user authentication functionality that applications typically require.
