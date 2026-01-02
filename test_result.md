# Test Results

## Test Session: Client Company Field & Client Profiles
**Date**: 2026-01-02
**Tester**: E1 Agent

### Changes Implemented:
1. **Client Company Field in Estimates**
   - Added `client_company` field to backend models (EstimateCreate, Estimate)
   - Added `client_company` field to estimate creation/update endpoints
   - Added UI field "Nombre de Empresa" in estimate form
   - Updated PDF export to include company name
   - Company name displays in estimate list with building icon

2. **Client Profiles Feature**
   - New `/api/client-profiles` GET endpoint to list saved profiles
   - New `/api/client-profiles` POST endpoint to create profiles
   - New `/api/client-profiles/find-or-create` POST endpoint for auto-creation
   - Frontend selector to load saved client data
   - Automatic profile creation when creating new estimates

3. **Bug Fixes**
   - Fixed duplicate code in Estimates.js loadData() function
   - Fixed MongoDB ObjectId serialization error in client-profiles endpoints

### Test Protocol:
1. Login and verify Estimates page loads correctly
2. Verify existing estimate shows company name (ABC Corporation)
3. Open "Nuevo Estimado" dialog
4. Verify "Cargar Cliente Guardado" selector appears
5. Verify "Nombre de Empresa" field exists
6. Create new estimate with company name
7. Verify new estimate shows company name in list
8. Verify client profile is created automatically
9. Verify saved client can be loaded into form

### Credentials:
- Email: jcarrion@ohsmspr.com
- Password: Admin2024!

### User Feedback to Incorporate:
- Complete the cascading calculation feature verification for Cost Estimates
- Test PDF generation with company name
- Verify automatic client profile creation works from UI
