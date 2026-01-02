# Test Results

## Test Session: Year Filter & PDF Changes
**Date**: 2025-01-02
**Tester**: E1 Agent

### Changes to Test:
1. **Year Filter in Dashboard** - Filter projects/stats by year
2. **Year Filter in Projects** - Filter project list by year  
3. **Year Filter in Invoices** - Filter invoice list by year
4. **Logo stretched more in PDFs** - From 55x35 to 60x45
5. **PO# below Invoice Number in PDFs** - Changed order in invoice PDFs
6. **Fixed 6% Contingency** - In Cost Estimate, contingency is now fixed at 6%

### Test Protocol:
1. Login and verify Dashboard loads with year selector
2. Select a year and verify stats update correctly
3. Navigate to Projects and verify year filter works
4. Navigate to Invoices and verify year filter works
5. Create/view a Cost Estimate and verify contingency is fixed at 6%
6. Generate a test PDF to verify logo size and PO# placement

### Credentials:
- Email: j.carrero@ohsmspr.com
- Password: Admin2024!

### User Feedback to Incorporate:
- Logo should be more stretched vertically
- PO# should appear below Invoice number
- Projects, Invoices and everything should be divided by year
- Contingency in Cost Estimate should be fixed at 6%
