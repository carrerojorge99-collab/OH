"""
Accounting Module for ProManage
Supports US Federal and Puerto Rico tax regulations
"""
from fastapi import APIRouter, HTTPException, Request, Cookie
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
from decimal import Decimal
from enum import Enum

accounting_router = APIRouter(prefix="/api/accounting", tags=["Accounting"])

# ==================== ENUMS ====================

class AccountType(str, Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"

class AccountSubType(str, Enum):
    # Assets
    CASH = "cash"
    ACCOUNTS_RECEIVABLE = "accounts_receivable"
    INVENTORY = "inventory"
    FIXED_ASSETS = "fixed_assets"
    OTHER_ASSETS = "other_assets"
    # Liabilities
    ACCOUNTS_PAYABLE = "accounts_payable"
    PAYROLL_LIABILITIES = "payroll_liabilities"
    TAXES_PAYABLE = "taxes_payable"
    LOANS = "loans"
    OTHER_LIABILITIES = "other_liabilities"
    # Equity
    OWNERS_EQUITY = "owners_equity"
    RETAINED_EARNINGS = "retained_earnings"
    # Revenue
    SALES = "sales"
    SERVICE_REVENUE = "service_revenue"
    OTHER_INCOME = "other_income"
    # Expense
    COST_OF_GOODS = "cost_of_goods"
    PAYROLL_EXPENSE = "payroll_expense"
    TAX_EXPENSE = "tax_expense"
    OPERATING_EXPENSE = "operating_expense"
    OTHER_EXPENSE = "other_expense"

class JournalEntryStatus(str, Enum):
    DRAFT = "draft"
    POSTED = "posted"
    VOIDED = "voided"

class TransactionType(str, Enum):
    INVOICE = "invoice"
    PAYMENT = "payment"
    EXPENSE = "expense"
    PAYROLL = "payroll"
    TAX_PAYMENT = "tax_payment"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"

class TaxType(str, Enum):
    # Puerto Rico taxes
    IVU_PR = "ivu_pr"  # 11.5% (10.5% state + 1% municipal)
    SURI = "suri"  # Planilla Patronal
    # US Federal taxes
    FEDERAL_INCOME = "federal_income"
    FICA_SS = "fica_ss"  # Social Security 6.2%
    FICA_MEDICARE = "fica_medicare"  # Medicare 1.45%
    FUTA = "futa"  # Federal Unemployment 6%
    # US State taxes (variable by state)
    STATE_INCOME = "state_income"
    SUTA = "suta"  # State Unemployment

# Tax rates configuration
TAX_RATES = {
    "ivu_pr": {"rate": 0.115, "description": "Puerto Rico IVU (Sales Tax)", "type": "sales"},
    "fica_ss_employee": {"rate": 0.062, "description": "Social Security (Employee)", "type": "payroll"},
    "fica_ss_employer": {"rate": 0.062, "description": "Social Security (Employer)", "type": "payroll"},
    "fica_medicare_employee": {"rate": 0.0145, "description": "Medicare (Employee)", "type": "payroll"},
    "fica_medicare_employer": {"rate": 0.0145, "description": "Medicare (Employer)", "type": "payroll"},
    "futa": {"rate": 0.06, "description": "Federal Unemployment (FUTA)", "type": "payroll", "wage_base": 7000},
    "pr_disability": {"rate": 0.004, "description": "PR Incapacidad (SINOT)", "type": "payroll"},
    "pr_unemployment": {"rate": 0.034, "description": "PR Desempleo", "type": "payroll"},
    "pr_chauffeur": {"rate": 0.0025, "description": "PR Chauffeur Insurance", "type": "payroll"},
}

# ==================== PYDANTIC MODELS ====================

class ChartOfAccountCreate(BaseModel):
    account_number: str
    account_name: str
    account_type: AccountType
    account_subtype: AccountSubType
    description: Optional[str] = ""
    parent_account_id: Optional[str] = None
    is_active: bool = True
    opening_balance: float = 0

class ChartOfAccount(BaseModel):
    account_id: str
    account_number: str
    account_name: str
    account_type: AccountType
    account_subtype: AccountSubType
    description: str
    parent_account_id: Optional[str]
    is_active: bool
    balance: float
    opening_balance: float
    created_at: str
    updated_at: str

class JournalEntryLineCreate(BaseModel):
    account_id: str
    description: Optional[str] = ""
    debit: float = 0
    credit: float = 0

class JournalEntryCreate(BaseModel):
    entry_date: str
    reference: Optional[str] = ""
    memo: str
    lines: List[JournalEntryLineCreate]
    transaction_type: TransactionType = TransactionType.ADJUSTMENT
    source_id: Optional[str] = None  # Link to invoice, payment, etc.

class JournalEntry(BaseModel):
    entry_id: str
    entry_number: int
    entry_date: str
    reference: str
    memo: str
    lines: List[dict]
    status: JournalEntryStatus
    transaction_type: TransactionType
    source_id: Optional[str]
    total_debit: float
    total_credit: float
    created_by: str
    created_at: str
    posted_at: Optional[str]

class AccountsReceivableCreate(BaseModel):
    customer_id: str
    customer_name: str
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = ""
    amount: float
    due_date: str
    description: str

class AccountsPayableCreate(BaseModel):
    vendor_id: str
    vendor_name: str
    bill_number: Optional[str] = ""
    amount: float
    due_date: str
    description: str

class PaymentCreate(BaseModel):
    ar_id: Optional[str] = None  # For AR payment
    ap_id: Optional[str] = None  # For AP payment
    amount: float
    payment_date: str
    payment_method: str
    reference: Optional[str] = ""
    notes: Optional[str] = ""

class BankAccountCreate(BaseModel):
    account_name: str
    bank_name: str
    account_number: str
    routing_number: str
    account_type: str  # checking, savings
    chart_account_id: str  # Link to chart of accounts
    opening_balance: float = 0
    current_balance: float = 0

class BankTransactionCreate(BaseModel):
    bank_account_id: str
    transaction_date: str
    description: str
    amount: float
    transaction_type: str  # deposit, withdrawal, transfer
    reference: Optional[str] = ""
    is_reconciled: bool = False

class TaxLiabilityCreate(BaseModel):
    tax_type: str
    period_start: str
    period_end: str
    amount: float
    due_date: str
    description: str

# ==================== HELPER FUNCTIONS ====================

async def get_db():
    from server import db
    return db

async def get_current_user_accounting(request: Request, session_token: Optional[str] = Cookie(None)):
    from server import get_current_user, UserRole
    user = await get_current_user(request, session_token)
    if user.role not in [UserRole.SUPER_ADMIN.value, UserRole.ACCOUNTANT.value]:
        raise HTTPException(status_code=403, detail="Access denied. Only accountants and super admins can access accounting.")
    return user

async def get_next_entry_number(db):
    """Get next journal entry number"""
    last_entry = await db.journal_entries.find_one(
        {}, sort=[("entry_number", -1)]
    )
    return (last_entry.get("entry_number", 0) + 1) if last_entry else 1

# ==================== CHART OF ACCOUNTS ENDPOINTS ====================

@accounting_router.get("/chart-of-accounts")
async def get_chart_of_accounts(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    account_type: Optional[str] = None,
    is_active: bool = True
):
    """Get all accounts in chart of accounts"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    query = {}
    if account_type:
        query["account_type"] = account_type
    if is_active is not None:
        query["is_active"] = is_active
    
    accounts = await db.chart_of_accounts.find(query, {"_id": 0}).sort("account_number", 1).to_list(1000)
    return accounts

@accounting_router.post("/chart-of-accounts")
async def create_account(
    account: ChartOfAccountCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create a new account in chart of accounts"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Check for duplicate account number
    existing = await db.chart_of_accounts.find_one({"account_number": account.account_number})
    if existing:
        raise HTTPException(status_code=400, detail="Account number already exists")
    
    account_doc = {
        "account_id": str(uuid4()),
        "account_number": account.account_number,
        "account_name": account.account_name,
        "account_type": account.account_type.value,
        "account_subtype": account.account_subtype.value,
        "description": account.description,
        "parent_account_id": account.parent_account_id,
        "is_active": account.is_active,
        "balance": account.opening_balance,
        "opening_balance": account.opening_balance,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chart_of_accounts.insert_one(account_doc)
    return {"message": "Account created successfully", "account_id": account_doc["account_id"]}

@accounting_router.put("/chart-of-accounts/{account_id}")
async def update_account(
    account_id: str,
    account: ChartOfAccountCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Update an account"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    existing = await db.chart_of_accounts.find_one({"account_id": account_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    
    update_data = {
        "account_number": account.account_number,
        "account_name": account.account_name,
        "account_type": account.account_type.value,
        "account_subtype": account.account_subtype.value,
        "description": account.description,
        "parent_account_id": account.parent_account_id,
        "is_active": account.is_active,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chart_of_accounts.update_one({"account_id": account_id}, {"$set": update_data})
    return {"message": "Account updated successfully"}

@accounting_router.delete("/chart-of-accounts/{account_id}")
async def delete_account(
    account_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Deactivate an account (soft delete)"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Check if account has transactions
    has_transactions = await db.journal_entry_lines.find_one({"account_id": account_id})
    if has_transactions:
        # Soft delete only
        await db.chart_of_accounts.update_one(
            {"account_id": account_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Account deactivated (has existing transactions)"}
    
    await db.chart_of_accounts.delete_one({"account_id": account_id})
    return {"message": "Account deleted successfully"}

@accounting_router.post("/chart-of-accounts/seed-default")
async def seed_default_accounts(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Seed default chart of accounts for US/PR business"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Check if accounts already exist
    count = await db.chart_of_accounts.count_documents({})
    if count > 0:
        raise HTTPException(status_code=400, detail="Chart of accounts already has entries. Cannot seed defaults.")
    
    default_accounts = [
        # Assets (1000-1999)
        {"account_number": "1000", "account_name": "Cash", "account_type": "asset", "account_subtype": "cash"},
        {"account_number": "1010", "account_name": "Petty Cash", "account_type": "asset", "account_subtype": "cash"},
        {"account_number": "1020", "account_name": "Checking Account", "account_type": "asset", "account_subtype": "cash"},
        {"account_number": "1030", "account_name": "Savings Account", "account_type": "asset", "account_subtype": "cash"},
        {"account_number": "1100", "account_name": "Accounts Receivable", "account_type": "asset", "account_subtype": "accounts_receivable"},
        {"account_number": "1200", "account_name": "Inventory", "account_type": "asset", "account_subtype": "inventory"},
        {"account_number": "1300", "account_name": "Prepaid Expenses", "account_type": "asset", "account_subtype": "other_assets"},
        {"account_number": "1500", "account_name": "Equipment", "account_type": "asset", "account_subtype": "fixed_assets"},
        {"account_number": "1510", "account_name": "Accumulated Depreciation - Equipment", "account_type": "asset", "account_subtype": "fixed_assets"},
        {"account_number": "1600", "account_name": "Vehicles", "account_type": "asset", "account_subtype": "fixed_assets"},
        {"account_number": "1610", "account_name": "Accumulated Depreciation - Vehicles", "account_type": "asset", "account_subtype": "fixed_assets"},
        
        # Liabilities (2000-2999)
        {"account_number": "2000", "account_name": "Accounts Payable", "account_type": "liability", "account_subtype": "accounts_payable"},
        {"account_number": "2100", "account_name": "Accrued Expenses", "account_type": "liability", "account_subtype": "other_liabilities"},
        {"account_number": "2200", "account_name": "Payroll Liabilities", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2210", "account_name": "Federal Withholding Payable", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2220", "account_name": "FICA Payable (Social Security)", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2225", "account_name": "FICA Payable (Medicare)", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2230", "account_name": "FUTA Payable", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2240", "account_name": "State Withholding Payable", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2250", "account_name": "SUTA Payable", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2300", "account_name": "IVU Payable (PR Sales Tax)", "account_type": "liability", "account_subtype": "taxes_payable"},
        {"account_number": "2310", "account_name": "PR Disability (SINOT) Payable", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2320", "account_name": "PR Chauffeur Insurance Payable", "account_type": "liability", "account_subtype": "payroll_liabilities"},
        {"account_number": "2400", "account_name": "Loans Payable", "account_type": "liability", "account_subtype": "loans"},
        {"account_number": "2500", "account_name": "Credit Card Payable", "account_type": "liability", "account_subtype": "other_liabilities"},
        
        # Equity (3000-3999)
        {"account_number": "3000", "account_name": "Owner's Equity", "account_type": "equity", "account_subtype": "owners_equity"},
        {"account_number": "3100", "account_name": "Owner's Draws", "account_type": "equity", "account_subtype": "owners_equity"},
        {"account_number": "3200", "account_name": "Retained Earnings", "account_type": "equity", "account_subtype": "retained_earnings"},
        
        # Revenue (4000-4999)
        {"account_number": "4000", "account_name": "Sales Revenue", "account_type": "revenue", "account_subtype": "sales"},
        {"account_number": "4100", "account_name": "Service Revenue", "account_type": "revenue", "account_subtype": "service_revenue"},
        {"account_number": "4200", "account_name": "Consulting Revenue", "account_type": "revenue", "account_subtype": "service_revenue"},
        {"account_number": "4900", "account_name": "Other Income", "account_type": "revenue", "account_subtype": "other_income"},
        {"account_number": "4910", "account_name": "Interest Income", "account_type": "revenue", "account_subtype": "other_income"},
        
        # Cost of Goods Sold (5000-5999)
        {"account_number": "5000", "account_name": "Cost of Goods Sold", "account_type": "expense", "account_subtype": "cost_of_goods"},
        {"account_number": "5100", "account_name": "Direct Labor", "account_type": "expense", "account_subtype": "cost_of_goods"},
        {"account_number": "5200", "account_name": "Materials", "account_type": "expense", "account_subtype": "cost_of_goods"},
        {"account_number": "5300", "account_name": "Subcontractors", "account_type": "expense", "account_subtype": "cost_of_goods"},
        
        # Operating Expenses (6000-6999)
        {"account_number": "6000", "account_name": "Salaries & Wages", "account_type": "expense", "account_subtype": "payroll_expense"},
        {"account_number": "6100", "account_name": "Payroll Taxes - Employer", "account_type": "expense", "account_subtype": "payroll_expense"},
        {"account_number": "6110", "account_name": "FICA Expense (Social Security)", "account_type": "expense", "account_subtype": "payroll_expense"},
        {"account_number": "6115", "account_name": "FICA Expense (Medicare)", "account_type": "expense", "account_subtype": "payroll_expense"},
        {"account_number": "6120", "account_name": "FUTA Expense", "account_type": "expense", "account_subtype": "payroll_expense"},
        {"account_number": "6130", "account_name": "SUTA Expense", "account_type": "expense", "account_subtype": "payroll_expense"},
        {"account_number": "6140", "account_name": "PR Disability Expense", "account_type": "expense", "account_subtype": "payroll_expense"},
        {"account_number": "6200", "account_name": "Rent Expense", "account_type": "expense", "account_subtype": "operating_expense"},
        {"account_number": "6300", "account_name": "Utilities", "account_type": "expense", "account_subtype": "operating_expense"},
        {"account_number": "6400", "account_name": "Insurance", "account_type": "expense", "account_subtype": "operating_expense"},
        {"account_number": "6500", "account_name": "Office Supplies", "account_type": "expense", "account_subtype": "operating_expense"},
        {"account_number": "6600", "account_name": "Professional Services", "account_type": "expense", "account_subtype": "operating_expense"},
        {"account_number": "6700", "account_name": "Travel & Entertainment", "account_type": "expense", "account_subtype": "operating_expense"},
        {"account_number": "6800", "account_name": "Depreciation Expense", "account_type": "expense", "account_subtype": "operating_expense"},
        {"account_number": "6900", "account_name": "Miscellaneous Expense", "account_type": "expense", "account_subtype": "other_expense"},
        
        # Taxes (7000-7999)
        {"account_number": "7000", "account_name": "Federal Income Tax Expense", "account_type": "expense", "account_subtype": "tax_expense"},
        {"account_number": "7100", "account_name": "State Income Tax Expense", "account_type": "expense", "account_subtype": "tax_expense"},
        {"account_number": "7200", "account_name": "PR Income Tax Expense", "account_type": "expense", "account_subtype": "tax_expense"},
    ]
    
    now = datetime.now(timezone.utc).isoformat()
    for acc in default_accounts:
        acc["account_id"] = str(uuid4())
        acc["description"] = ""
        acc["parent_account_id"] = None
        acc["is_active"] = True
        acc["balance"] = 0
        acc["opening_balance"] = 0
        acc["created_by"] = user.user_id
        acc["created_at"] = now
        acc["updated_at"] = now
    
    await db.chart_of_accounts.insert_many(default_accounts)
    return {"message": f"Created {len(default_accounts)} default accounts"}

# ==================== JOURNAL ENTRIES ENDPOINTS ====================

@accounting_router.get("/journal-entries")
async def get_journal_entries(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get journal entries with filters"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    query = {}
    if status:
        query["status"] = status
    if start_date:
        query["entry_date"] = {"$gte": start_date}
    if end_date:
        if "entry_date" in query:
            query["entry_date"]["$lte"] = end_date
        else:
            query["entry_date"] = {"$lte": end_date}
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("entry_date", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.journal_entries.count_documents(query)
    
    return {"entries": entries, "total": total}

@accounting_router.post("/journal-entries")
async def create_journal_entry(
    entry: JournalEntryCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create a new journal entry"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Validate debits = credits
    total_debit = sum(line.debit for line in entry.lines)
    total_credit = sum(line.credit for line in entry.lines)
    
    if round(total_debit, 2) != round(total_credit, 2):
        raise HTTPException(
            status_code=400,
            detail=f"Journal entry must balance. Debits: {total_debit}, Credits: {total_credit}"
        )
    
    # Validate all account IDs exist
    for line in entry.lines:
        account = await db.chart_of_accounts.find_one({"account_id": line.account_id})
        if not account:
            raise HTTPException(status_code=400, detail=f"Account {line.account_id} not found")
    
    entry_number = await get_next_entry_number(db)
    entry_id = str(uuid4())
    
    lines_with_names = []
    for line in entry.lines:
        account = await db.chart_of_accounts.find_one({"account_id": line.account_id})
        lines_with_names.append({
            "line_id": str(uuid4()),
            "account_id": line.account_id,
            "account_number": account["account_number"],
            "account_name": account["account_name"],
            "description": line.description,
            "debit": line.debit,
            "credit": line.credit
        })
    
    entry_doc = {
        "entry_id": entry_id,
        "entry_number": entry_number,
        "entry_date": entry.entry_date,
        "reference": entry.reference,
        "memo": entry.memo,
        "lines": lines_with_names,
        "status": JournalEntryStatus.DRAFT.value,
        "transaction_type": entry.transaction_type.value,
        "source_id": entry.source_id,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "posted_at": None
    }
    
    await db.journal_entries.insert_one(entry_doc)
    return {"message": "Journal entry created", "entry_id": entry_id, "entry_number": entry_number}

@accounting_router.post("/journal-entries/{entry_id}/post")
async def post_journal_entry(
    entry_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Post a journal entry and update account balances"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    entry = await db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry["status"] == JournalEntryStatus.POSTED.value:
        raise HTTPException(status_code=400, detail="Entry already posted")
    
    if entry["status"] == JournalEntryStatus.VOIDED.value:
        raise HTTPException(status_code=400, detail="Cannot post a voided entry")
    
    # Update account balances
    for line in entry["lines"]:
        account = await db.chart_of_accounts.find_one({"account_id": line["account_id"]})
        if account:
            # Debit increases assets/expenses, decreases liabilities/equity/revenue
            # Credit decreases assets/expenses, increases liabilities/equity/revenue
            balance_change = 0
            if account["account_type"] in ["asset", "expense"]:
                balance_change = line["debit"] - line["credit"]
            else:  # liability, equity, revenue
                balance_change = line["credit"] - line["debit"]
            
            await db.chart_of_accounts.update_one(
                {"account_id": line["account_id"]},
                {"$inc": {"balance": balance_change}}
            )
    
    await db.journal_entries.update_one(
        {"entry_id": entry_id},
        {"$set": {
            "status": JournalEntryStatus.POSTED.value,
            "posted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Journal entry posted successfully"}

@accounting_router.post("/journal-entries/{entry_id}/void")
async def void_journal_entry(
    entry_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Void a journal entry (reverse if posted)"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    entry = await db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry["status"] == JournalEntryStatus.VOIDED.value:
        raise HTTPException(status_code=400, detail="Entry already voided")
    
    # If posted, reverse the account balances
    if entry["status"] == JournalEntryStatus.POSTED.value:
        for line in entry["lines"]:
            account = await db.chart_of_accounts.find_one({"account_id": line["account_id"]})
            if account:
                # Reverse the balance change
                balance_change = 0
                if account["account_type"] in ["asset", "expense"]:
                    balance_change = -(line["debit"] - line["credit"])
                else:
                    balance_change = -(line["credit"] - line["debit"])
                
                await db.chart_of_accounts.update_one(
                    {"account_id": line["account_id"]},
                    {"$inc": {"balance": balance_change}}
                )
    
    await db.journal_entries.update_one(
        {"entry_id": entry_id},
        {"$set": {
            "status": JournalEntryStatus.VOIDED.value,
            "voided_at": datetime.now(timezone.utc).isoformat(),
            "voided_by": user.user_id
        }}
    )
    
    return {"message": "Journal entry voided successfully"}

@accounting_router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(
    entry_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Delete a journal entry (only draft entries can be deleted)"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    entry = await db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry["status"] == JournalEntryStatus.POSTED.value:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete a posted entry. Use void instead to maintain audit trail."
        )
    
    if entry["status"] == JournalEntryStatus.VOIDED.value:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete a voided entry. It must be kept for audit trail."
        )
    
    # Only draft entries can be deleted
    await db.journal_entries.delete_one({"entry_id": entry_id})
    
    return {"message": "Journal entry deleted successfully"}

# ==================== GENERAL LEDGER ENDPOINTS ====================

@accounting_router.get("/general-ledger")
async def get_general_ledger(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    account_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get general ledger with account activity"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Get all posted journal entries in date range
    query = {"status": JournalEntryStatus.POSTED.value}
    if start_date:
        query["entry_date"] = {"$gte": start_date}
    if end_date:
        if "entry_date" in query:
            query["entry_date"]["$lte"] = end_date
        else:
            query["entry_date"] = {"$lte": end_date}
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("entry_date", 1).to_list(10000)
    
    # Build ledger by account
    ledger = {}
    accounts = await db.chart_of_accounts.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    for account in accounts:
        if account_id and account["account_id"] != account_id:
            continue
            
        ledger[account["account_id"]] = {
            "account_id": account["account_id"],
            "account_number": account["account_number"],
            "account_name": account["account_name"],
            "account_type": account["account_type"],
            "opening_balance": account["opening_balance"],
            "current_balance": account["balance"],
            "transactions": []
        }
    
    # Add transactions to ledger
    for entry in entries:
        for line in entry["lines"]:
            if line["account_id"] in ledger:
                ledger[line["account_id"]]["transactions"].append({
                    "entry_id": entry["entry_id"],
                    "entry_number": entry["entry_number"],
                    "entry_date": entry["entry_date"],
                    "reference": entry["reference"],
                    "memo": entry["memo"],
                    "description": line["description"],
                    "debit": line["debit"],
                    "credit": line["credit"]
                })
    
    return list(ledger.values())

# ==================== ACCOUNTS RECEIVABLE ENDPOINTS ====================

@accounting_router.get("/accounts-receivable")
async def get_accounts_receivable(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    status: Optional[str] = None
):
    """Get all accounts receivable"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    ar_list = await db.accounts_receivable.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return ar_list

@accounting_router.post("/accounts-receivable")
async def create_accounts_receivable(
    ar: AccountsReceivableCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create accounts receivable entry"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    ar_doc = {
        "ar_id": str(uuid4()),
        "customer_id": ar.customer_id,
        "customer_name": ar.customer_name,
        "invoice_id": ar.invoice_id,
        "invoice_number": ar.invoice_number,
        "amount": ar.amount,
        "amount_paid": 0,
        "balance": ar.amount,
        "due_date": ar.due_date,
        "description": ar.description,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.accounts_receivable.insert_one(ar_doc)
    return {"message": "AR created", "ar_id": ar_doc["ar_id"]}

@accounting_router.post("/accounts-receivable/{ar_id}/payment")
async def record_ar_payment(
    ar_id: str,
    payment: PaymentCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Record payment for accounts receivable"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    ar = await db.accounts_receivable.find_one({"ar_id": ar_id})
    if not ar:
        raise HTTPException(status_code=404, detail="AR not found")
    
    new_amount_paid = ar["amount_paid"] + payment.amount
    new_balance = ar["amount"] - new_amount_paid
    new_status = "paid" if new_balance <= 0 else "partial"
    
    # Record payment
    payment_doc = {
        "payment_id": str(uuid4()),
        "ar_id": ar_id,
        "amount": payment.amount,
        "payment_date": payment.payment_date,
        "payment_method": payment.payment_method,
        "reference": payment.reference,
        "notes": payment.notes,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ar_payments.insert_one(payment_doc)
    
    await db.accounts_receivable.update_one(
        {"ar_id": ar_id},
        {"$set": {
            "amount_paid": new_amount_paid,
            "balance": max(0, new_balance),
            "status": new_status
        }}
    )
    
    return {"message": "Payment recorded", "new_balance": max(0, new_balance)}

# ==================== ACCOUNTS PAYABLE ENDPOINTS ====================

@accounting_router.get("/accounts-payable")
async def get_accounts_payable(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    status: Optional[str] = None
):
    """Get all accounts payable"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    ap_list = await db.accounts_payable.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return ap_list

@accounting_router.post("/accounts-payable")
async def create_accounts_payable(
    ap: AccountsPayableCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create accounts payable entry"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    ap_doc = {
        "ap_id": str(uuid4()),
        "vendor_id": ap.vendor_id,
        "vendor_name": ap.vendor_name,
        "bill_number": ap.bill_number,
        "amount": ap.amount,
        "amount_paid": 0,
        "balance": ap.amount,
        "due_date": ap.due_date,
        "description": ap.description,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.accounts_payable.insert_one(ap_doc)
    return {"message": "AP created", "ap_id": ap_doc["ap_id"]}

@accounting_router.post("/accounts-payable/{ap_id}/payment")
async def record_ap_payment(
    ap_id: str,
    payment: PaymentCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Record payment for accounts payable"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    ap = await db.accounts_payable.find_one({"ap_id": ap_id})
    if not ap:
        raise HTTPException(status_code=404, detail="AP not found")
    
    new_amount_paid = ap["amount_paid"] + payment.amount
    new_balance = ap["amount"] - new_amount_paid
    new_status = "paid" if new_balance <= 0 else "partial"
    
    payment_doc = {
        "payment_id": str(uuid4()),
        "ap_id": ap_id,
        "amount": payment.amount,
        "payment_date": payment.payment_date,
        "payment_method": payment.payment_method,
        "reference": payment.reference,
        "notes": payment.notes,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ap_payments.insert_one(payment_doc)
    
    await db.accounts_payable.update_one(
        {"ap_id": ap_id},
        {"$set": {
            "amount_paid": new_amount_paid,
            "balance": max(0, new_balance),
            "status": new_status
        }}
    )
    
    return {"message": "Payment recorded", "new_balance": max(0, new_balance)}

# ==================== BANK RECONCILIATION ENDPOINTS ====================

@accounting_router.get("/bank-accounts")
async def get_bank_accounts(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get all bank accounts"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    accounts = await db.bank_accounts.find({}, {"_id": 0}).to_list(100)
    return accounts

@accounting_router.post("/bank-accounts")
async def create_bank_account(
    bank_account: BankAccountCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create a bank account for reconciliation"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    account_doc = {
        "bank_account_id": str(uuid4()),
        "account_name": bank_account.account_name,
        "bank_name": bank_account.bank_name,
        "account_number": bank_account.account_number[-4:],  # Store only last 4 digits
        "routing_number": bank_account.routing_number[-4:],
        "account_type": bank_account.account_type,
        "chart_account_id": bank_account.chart_account_id,
        "opening_balance": bank_account.opening_balance,
        "current_balance": bank_account.current_balance or bank_account.opening_balance,
        "last_reconciled_date": None,
        "last_reconciled_balance": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bank_accounts.insert_one(account_doc)
    return {"message": "Bank account created", "bank_account_id": account_doc["bank_account_id"]}

@accounting_router.get("/bank-accounts/{bank_account_id}/transactions")
async def get_bank_transactions(
    bank_account_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None),
    reconciled: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get bank transactions for reconciliation"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    query = {"bank_account_id": bank_account_id}
    if reconciled is not None:
        query["is_reconciled"] = reconciled
    if start_date:
        query["transaction_date"] = {"$gte": start_date}
    if end_date:
        if "transaction_date" in query:
            query["transaction_date"]["$lte"] = end_date
        else:
            query["transaction_date"] = {"$lte": end_date}
    
    transactions = await db.bank_transactions.find(query, {"_id": 0}).sort("transaction_date", -1).to_list(1000)
    return transactions

@accounting_router.post("/bank-accounts/{bank_account_id}/transactions")
async def create_bank_transaction(
    bank_account_id: str,
    transaction: BankTransactionCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create a bank transaction"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    trans_doc = {
        "transaction_id": str(uuid4()),
        "bank_account_id": bank_account_id,
        "transaction_date": transaction.transaction_date,
        "description": transaction.description,
        "amount": transaction.amount,
        "transaction_type": transaction.transaction_type,
        "reference": transaction.reference,
        "is_reconciled": False,
        "reconciled_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bank_transactions.insert_one(trans_doc)
    
    # Update bank account balance
    balance_change = transaction.amount if transaction.transaction_type == "deposit" else -transaction.amount
    await db.bank_accounts.update_one(
        {"bank_account_id": bank_account_id},
        {"$inc": {"current_balance": balance_change}}
    )
    
    return {"message": "Transaction created", "transaction_id": trans_doc["transaction_id"]}

@accounting_router.post("/bank-accounts/{bank_account_id}/reconcile")
async def reconcile_bank_account(
    bank_account_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None),
    statement_balance: float = 0,
    statement_date: str = None,
    transaction_ids: List[str] = []
):
    """Mark transactions as reconciled"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Mark selected transactions as reconciled
    await db.bank_transactions.update_many(
        {"transaction_id": {"$in": transaction_ids}},
        {"$set": {
            "is_reconciled": True,
            "reconciled_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update bank account reconciliation info
    await db.bank_accounts.update_one(
        {"bank_account_id": bank_account_id},
        {"$set": {
            "last_reconciled_date": statement_date or datetime.now(timezone.utc).isoformat(),
            "last_reconciled_balance": statement_balance
        }}
    )
    
    return {"message": "Reconciliation completed"}

# ==================== TAX MANAGEMENT ENDPOINTS ====================

@accounting_router.get("/tax-rates")
async def get_tax_rates(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get configured tax rates for US/PR"""
    user = await get_current_user_accounting(request, session_token)
    return TAX_RATES

@accounting_router.get("/tax-liabilities")
async def get_tax_liabilities(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    tax_type: Optional[str] = None,
    status: Optional[str] = None
):
    """Get tax liabilities"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    query = {}
    if tax_type:
        query["tax_type"] = tax_type
    if status:
        query["status"] = status
    
    liabilities = await db.tax_liabilities.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return liabilities

@accounting_router.post("/tax-liabilities")
async def create_tax_liability(
    liability: TaxLiabilityCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create a tax liability"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    liability_doc = {
        "liability_id": str(uuid4()),
        "tax_type": liability.tax_type,
        "period_start": liability.period_start,
        "period_end": liability.period_end,
        "amount": liability.amount,
        "amount_paid": 0,
        "balance": liability.amount,
        "due_date": liability.due_date,
        "description": liability.description,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_liabilities.insert_one(liability_doc)
    return {"message": "Tax liability created", "liability_id": liability_doc["liability_id"]}

@accounting_router.post("/tax-liabilities/{liability_id}/payment")
async def record_tax_payment(
    liability_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None),
    amount: float = 0,
    payment_date: str = None,
    reference: str = ""
):
    """Record tax payment"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    liability = await db.tax_liabilities.find_one({"liability_id": liability_id})
    if not liability:
        raise HTTPException(status_code=404, detail="Tax liability not found")
    
    new_amount_paid = liability["amount_paid"] + amount
    new_balance = liability["amount"] - new_amount_paid
    new_status = "paid" if new_balance <= 0 else "partial"
    
    payment_doc = {
        "payment_id": str(uuid4()),
        "liability_id": liability_id,
        "amount": amount,
        "payment_date": payment_date or datetime.now(timezone.utc).isoformat(),
        "reference": reference,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_payments.insert_one(payment_doc)
    
    await db.tax_liabilities.update_one(
        {"liability_id": liability_id},
        {"$set": {
            "amount_paid": new_amount_paid,
            "balance": max(0, new_balance),
            "status": new_status
        }}
    )
    
    return {"message": "Tax payment recorded"}

# ==================== FINANCIAL REPORTS ENDPOINTS ====================

@accounting_router.get("/reports/trial-balance")
async def get_trial_balance(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    as_of_date: Optional[str] = None
):
    """Get trial balance report"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    accounts = await db.chart_of_accounts.find({"is_active": True}, {"_id": 0}).sort("account_number", 1).to_list(1000)
    
    trial_balance = []
    total_debits = 0
    total_credits = 0
    
    for account in accounts:
        balance = account["balance"]
        debit = 0
        credit = 0
        
        if account["account_type"] in ["asset", "expense"]:
            if balance >= 0:
                debit = balance
            else:
                credit = abs(balance)
        else:  # liability, equity, revenue
            if balance >= 0:
                credit = balance
            else:
                debit = abs(balance)
        
        if debit != 0 or credit != 0:
            trial_balance.append({
                "account_number": account["account_number"],
                "account_name": account["account_name"],
                "account_type": account["account_type"],
                "debit": debit,
                "credit": credit
            })
            total_debits += debit
            total_credits += credit
    
    return {
        "as_of_date": as_of_date or datetime.now(timezone.utc).isoformat()[:10],
        "accounts": trial_balance,
        "total_debits": round(total_debits, 2),
        "total_credits": round(total_credits, 2),
        "is_balanced": round(total_debits, 2) == round(total_credits, 2)
    }

@accounting_router.get("/reports/balance-sheet")
async def get_balance_sheet(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    as_of_date: Optional[str] = None
):
    """Get balance sheet report"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    accounts = await db.chart_of_accounts.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    assets = []
    liabilities = []
    equity = []
    
    total_assets = 0
    total_liabilities = 0
    total_equity = 0
    
    for account in accounts:
        item = {
            "account_number": account["account_number"],
            "account_name": account["account_name"],
            "balance": account["balance"]
        }
        
        if account["account_type"] == "asset":
            assets.append(item)
            total_assets += account["balance"]
        elif account["account_type"] == "liability":
            liabilities.append(item)
            total_liabilities += account["balance"]
        elif account["account_type"] == "equity":
            equity.append(item)
            total_equity += account["balance"]
    
    # Calculate net income and add to equity
    revenue_accounts = [a for a in accounts if a["account_type"] == "revenue"]
    expense_accounts = [a for a in accounts if a["account_type"] == "expense"]
    net_income = sum(a["balance"] for a in revenue_accounts) - sum(a["balance"] for a in expense_accounts)
    
    equity.append({
        "account_number": "NET",
        "account_name": "Net Income (Current Period)",
        "balance": net_income
    })
    total_equity += net_income
    
    return {
        "as_of_date": as_of_date or datetime.now(timezone.utc).isoformat()[:10],
        "assets": sorted(assets, key=lambda x: x["account_number"]),
        "liabilities": sorted(liabilities, key=lambda x: x["account_number"]),
        "equity": sorted(equity, key=lambda x: x["account_number"]),
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "total_equity": round(total_equity, 2),
        "is_balanced": round(total_assets, 2) == round(total_liabilities + total_equity, 2)
    }

@accounting_router.get("/reports/income-statement")
async def get_income_statement(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get income statement (Profit & Loss)"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    accounts = await db.chart_of_accounts.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    revenue = []
    cost_of_goods = []
    expenses = []
    
    total_revenue = 0
    total_cogs = 0
    total_expenses = 0
    
    for account in accounts:
        item = {
            "account_number": account["account_number"],
            "account_name": account["account_name"],
            "balance": account["balance"]
        }
        
        if account["account_type"] == "revenue":
            revenue.append(item)
            total_revenue += account["balance"]
        elif account["account_type"] == "expense":
            if account["account_subtype"] == "cost_of_goods":
                cost_of_goods.append(item)
                total_cogs += account["balance"]
            else:
                expenses.append(item)
                total_expenses += account["balance"]
    
    gross_profit = total_revenue - total_cogs
    net_income = gross_profit - total_expenses
    
    return {
        "period_start": start_date or "Beginning",
        "period_end": end_date or datetime.now(timezone.utc).isoformat()[:10],
        "revenue": sorted(revenue, key=lambda x: x["account_number"]),
        "cost_of_goods_sold": sorted(cost_of_goods, key=lambda x: x["account_number"]),
        "expenses": sorted(expenses, key=lambda x: x["account_number"]),
        "total_revenue": round(total_revenue, 2),
        "total_cost_of_goods_sold": round(total_cogs, 2),
        "gross_profit": round(gross_profit, 2),
        "total_expenses": round(total_expenses, 2),
        "net_income": round(net_income, 2)
    }

@accounting_router.get("/reports/form-941")
async def get_form_941_data(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    quarter: int = 1,
    year: int = None
):
    """Get data for IRS Form 941 (Quarterly Federal Tax Return)"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    if not year:
        year = datetime.now().year
    
    # Calculate quarter date range
    quarter_starts = {1: "01-01", 2: "04-01", 3: "07-01", 4: "10-01"}
    quarter_ends = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}
    
    start_date = f"{year}-{quarter_starts[quarter]}"
    end_date = f"{year}-{quarter_ends[quarter]}"
    
    # Get payroll data for the quarter
    payroll_entries = await db.journal_entries.find({
        "transaction_type": "payroll",
        "entry_date": {"$gte": start_date, "$lte": end_date},
        "status": "posted"
    }, {"_id": 0}).to_list(1000)
    
    # Get tax liabilities for the quarter
    tax_liabilities = await db.tax_liabilities.find({
        "period_start": {"$gte": start_date},
        "period_end": {"$lte": end_date}
    }, {"_id": 0}).to_list(100)
    
    # Calculate totals (simplified - in real implementation would parse actual payroll)
    total_wages = 0
    total_federal_withholding = 0
    total_social_security = 0
    total_medicare = 0
    
    for liability in tax_liabilities:
        if "federal" in liability.get("tax_type", "").lower():
            total_federal_withholding += liability.get("amount", 0)
        elif "fica_ss" in liability.get("tax_type", "").lower():
            total_social_security += liability.get("amount", 0)
        elif "medicare" in liability.get("tax_type", "").lower():
            total_medicare += liability.get("amount", 0)
    
    return {
        "form": "941",
        "quarter": quarter,
        "year": year,
        "period_start": start_date,
        "period_end": end_date,
        "line_1_employees": 0,  # Would need employee count
        "line_2_wages": round(total_wages, 2),
        "line_3_federal_withholding": round(total_federal_withholding, 2),
        "line_5a_social_security_wages": round(total_wages, 2),
        "line_5a_social_security_tax": round(total_social_security, 2),
        "line_5c_medicare_wages": round(total_wages, 2),
        "line_5c_medicare_tax": round(total_medicare, 2),
        "line_6_total_taxes": round(total_federal_withholding + total_social_security + total_medicare, 2),
        "note": "This is estimated data. Please verify with actual payroll records."
    }

@accounting_router.get("/reports/form-940")
async def get_form_940_data(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    year: int = None
):
    """Get data for IRS Form 940 (FUTA Annual Return)"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    if not year:
        year = datetime.now().year
    
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"
    
    tax_liabilities = await db.tax_liabilities.find({
        "tax_type": {"$regex": "futa", "$options": "i"},
        "period_start": {"$gte": start_date},
        "period_end": {"$lte": end_date}
    }, {"_id": 0}).to_list(100)
    
    total_futa = sum(l.get("amount", 0) for l in tax_liabilities)
    futa_wage_base = 7000  # Federal wage base for FUTA
    
    return {
        "form": "940",
        "year": year,
        "futa_wage_base": futa_wage_base,
        "futa_rate": 0.06,
        "total_futa_liability": round(total_futa, 2),
        "payments_made": sum(l.get("amount_paid", 0) for l in tax_liabilities),
        "balance_due": round(total_futa - sum(l.get("amount_paid", 0) for l in tax_liabilities), 2),
        "note": "This is estimated data. Please verify with actual payroll records."
    }

@accounting_router.get("/reports/ivu-pr")
async def get_ivu_report(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    month: int = None,
    year: int = None
):
    """Get Puerto Rico IVU (Sales Tax) report"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # Calculate month date range
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year}-12-31"
    else:
        end_date = f"{year}-{month+1:02d}-01"
    
    # Get IVU liabilities
    ivu_liabilities = await db.tax_liabilities.find({
        "tax_type": {"$regex": "ivu", "$options": "i"},
        "period_start": {"$gte": start_date},
        "period_end": {"$lt": end_date}
    }, {"_id": 0}).to_list(100)
    
    total_ivu = sum(l.get("amount", 0) for l in ivu_liabilities)
    ivu_rate = 0.115  # 11.5%
    
    # Estimate taxable sales from IVU amount
    estimated_taxable_sales = total_ivu / ivu_rate if ivu_rate > 0 else 0
    
    return {
        "report": "IVU Puerto Rico",
        "period": f"{year}-{month:02d}",
        "ivu_rate": ivu_rate,
        "ivu_rate_breakdown": {
            "state": 0.105,
            "municipal": 0.01
        },
        "estimated_taxable_sales": round(estimated_taxable_sales, 2),
        "total_ivu_collected": round(total_ivu, 2),
        "payments_made": sum(l.get("amount_paid", 0) for l in ivu_liabilities),
        "balance_due": round(total_ivu - sum(l.get("amount_paid", 0) for l in ivu_liabilities), 2),
        "due_date": f"{year}-{month+1 if month < 12 else 1:02d}-20",
        "note": "File through SURI (Sistema Unificado de Rentas Internas)"
    }

# ==================== DASHBOARD ENDPOINTS ====================

@accounting_router.get("/dashboard")
async def get_accounting_dashboard(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get accounting dashboard summary"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Get account totals
    accounts = await db.chart_of_accounts.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    total_assets = sum(a["balance"] for a in accounts if a["account_type"] == "asset")
    total_liabilities = sum(a["balance"] for a in accounts if a["account_type"] == "liability")
    total_revenue = sum(a["balance"] for a in accounts if a["account_type"] == "revenue")
    total_expenses = sum(a["balance"] for a in accounts if a["account_type"] == "expense")
    
    # Get AR/AP summaries
    ar_total = await db.accounts_receivable.aggregate([
        {"$match": {"status": {"$ne": "paid"}}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}}
    ]).to_list(1)
    
    ap_total = await db.accounts_payable.aggregate([
        {"$match": {"status": {"$ne": "paid"}}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}}
    ]).to_list(1)
    
    # Get pending tax liabilities
    tax_total = await db.tax_liabilities.aggregate([
        {"$match": {"status": {"$ne": "paid"}}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}}
    ]).to_list(1)
    
    # Recent journal entries
    recent_entries = await db.journal_entries.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "summary": {
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "net_worth": round(total_assets - total_liabilities, 2),
            "total_revenue": round(total_revenue, 2),
            "total_expenses": round(total_expenses, 2),
            "net_income": round(total_revenue - total_expenses, 2)
        },
        "receivables": {
            "total_outstanding": ar_total[0]["total"] if ar_total else 0
        },
        "payables": {
            "total_outstanding": ap_total[0]["total"] if ap_total else 0
        },
        "tax_liabilities": {
            "total_pending": tax_total[0]["total"] if tax_total else 0
        },
        "recent_entries": recent_entries
    }

# ==================== INTEGRATION ENDPOINTS ====================

@accounting_router.post("/sync-invoices")
async def sync_invoices_to_ar(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Sync invoices to accounts receivable"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # Get all unpaid invoices not yet in AR
    invoices = await db.invoices.find({
        "status": {"$in": ["pending", "partial"]}
    }, {"_id": 0}).to_list(1000)
    
    synced = 0
    for invoice in invoices:
        # Check if already in AR
        existing = await db.accounts_receivable.find_one({"invoice_id": invoice.get("invoice_id")})
        if not existing:
            ar_doc = {
                "ar_id": str(uuid4()),
                "customer_id": invoice.get("client_id", ""),
                "customer_name": invoice.get("client_name", ""),
                "invoice_id": invoice.get("invoice_id"),
                "invoice_number": invoice.get("invoice_number", ""),
                "amount": invoice.get("total", 0),
                "amount_paid": invoice.get("amount_paid", 0),
                "balance": invoice.get("total", 0) - invoice.get("amount_paid", 0),
                "due_date": invoice.get("due_date", ""),
                "description": f"Invoice {invoice.get('invoice_number', '')}",
                "status": "open" if invoice.get("status") == "pending" else "partial",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.accounts_receivable.insert_one(ar_doc)
            synced += 1
    
    return {"message": f"Synced {synced} invoices to AR"}

@accounting_router.post("/sync-payroll")
async def sync_payroll_to_accounting(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    payroll_id: str = None
):
    """Create journal entries from payroll"""
    user = await get_current_user_accounting(request, session_token)
    db = await get_db()
    
    # This would integrate with the payroll system
    # For now, return a placeholder
    return {
        "message": "Payroll sync endpoint ready",
        "note": "Connect to payroll module for automatic journal entry creation"
    }
