import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Plus,
  RefreshCw,
  MoreVertical,
  Check,
  X,
  Download,
  Building2,
  CreditCard,
  Receipt,
  Calculator,
  Landmark,
  BookOpen,
  PiggyBank,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const Accounting = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  
  // Chart of Accounts state
  const [accounts, setAccounts] = useState([]);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    account_number: '',
    account_name: '',
    account_type: 'asset',
    account_subtype: 'cash',
    description: '',
    opening_balance: 0
  });
  
  // Journal Entries state
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entry_date: moment().format('YYYY-MM-DD'),
    reference: '',
    memo: '',
    transaction_type: 'adjustment',
    lines: [
      { account_id: '', description: '', debit: 0, credit: 0 },
      { account_id: '', description: '', debit: 0, credit: 0 }
    ]
  });
  
  // AR/AP state
  const [arList, setArList] = useState([]);
  const [apList, setApList] = useState([]);
  const [arDialogOpen, setArDialogOpen] = useState(false);
  const [apDialogOpen, setApDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [paymentType, setPaymentType] = useState('ar');
  
  // Cash Flow Projection state
  const [cashFlowData, setCashFlowData] = useState(null);
  const [loadingCashFlow, setLoadingCashFlow] = useState(false);
  
  // Migration state
  const [migrating, setMigrating] = useState(false);
  
  // Bank state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  
  // Tax state
  const [taxLiabilities, setTaxLiabilities] = useState([]);
  const [taxRates, setTaxRates] = useState({});
  
  // Reports state
  const [trialBalance, setTrialBalance] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [form941Data, setForm941Data] = useState(null);
  const [form940Data, setForm940Data] = useState(null);
  const [ivuData, setIvuData] = useState(null);

  useEffect(() => {
    loadDashboard();
    loadAccounts();
    loadCashFlow();
  }, []);

  useEffect(() => {
    if (activeTab === 'journal') loadJournalEntries();
    if (activeTab === 'ar') loadAR();
    if (activeTab === 'ap') loadAP();
    if (activeTab === 'bank') loadBankAccounts();
    if (activeTab === 'taxes') {
      loadTaxLiabilities();
      loadTaxRates();
    }
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'cashflow') loadCashFlow();
  }, [activeTab]);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/accounting/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounting/chart-of-accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  };

  const loadJournalEntries = async () => {
    try {
      const res = await api.get('/accounting/journal-entries');
      setJournalEntries(res.data.entries || []);
    } catch (err) {
      console.error('Error loading journal entries:', err);
    }
  };

  const loadAR = async () => {
    try {
      const res = await api.get('/accounting/accounts-receivable');
      setArList(res.data);
    } catch (err) {
      console.error('Error loading AR:', err);
    }
  };

  const loadAP = async () => {
    try {
      const res = await api.get('/accounting/accounts-payable');
      setApList(res.data);
    } catch (err) {
      console.error('Error loading AP:', err);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const res = await api.get('/accounting/bank-accounts');
      setBankAccounts(res.data);
    } catch (err) {
      console.error('Error loading bank accounts:', err);
    }
  };

  const loadTaxLiabilities = async () => {
    try {
      const res = await api.get('/accounting/tax-liabilities');
      setTaxLiabilities(res.data);
    } catch (err) {
      console.error('Error loading tax liabilities:', err);
    }
  };

  const loadTaxRates = async () => {
    try {
      const res = await api.get('/accounting/tax-rates');
      setTaxRates(res.data);
    } catch (err) {
      console.error('Error loading tax rates:', err);
    }
  };

  const loadReports = async () => {
    try {
      const [tb, bs, is, f941, f940, ivu] = await Promise.all([
        api.get('/accounting/reports/trial-balance'),
        api.get('/accounting/reports/balance-sheet'),
        api.get('/accounting/reports/income-statement'),
        api.get('/accounting/reports/form-941', { params: { quarter: Math.ceil((new Date().getMonth() + 1) / 3) } }),
        api.get('/accounting/reports/form-940'),
        api.get('/accounting/reports/ivu-pr')
      ]);
      setTrialBalance(tb.data);
      setBalanceSheet(bs.data);
      setIncomeStatement(is.data);
      setForm941Data(f941.data);
      setForm940Data(f940.data);
      setIvuData(ivu.data);
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  };

  const seedDefaultAccounts = async () => {
    try {
      await api.post('/accounting/chart-of-accounts/seed-default');
      toast.success('Default accounts created successfully');
      loadAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create default accounts');
    }
  };

  const createAccount = async () => {
    try {
      await api.post('/accounting/chart-of-accounts', accountForm);
      toast.success('Account created successfully');
      setAccountDialogOpen(false);
      loadAccounts();
      resetAccountForm();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create account');
    }
  };

  const resetAccountForm = () => {
    setAccountForm({
      account_number: '',
      account_name: '',
      account_type: 'asset',
      account_subtype: 'cash',
      description: '',
      opening_balance: 0
    });
  };

  const createJournalEntry = async () => {
    // Validate balance
    const totalDebit = journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const totalCredit = journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(`Entry must balance. Debits: $${totalDebit.toFixed(2)}, Credits: $${totalCredit.toFixed(2)}`);
      return;
    }
    
    try {
      await api.post('/accounting/journal-entries', journalForm);
      toast.success('Journal entry created');
      setJournalDialogOpen(false);
      loadJournalEntries();
      resetJournalForm();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create journal entry');
    }
  };

  const resetJournalForm = () => {
    setJournalForm({
      entry_date: moment().format('YYYY-MM-DD'),
      reference: '',
      memo: '',
      transaction_type: 'adjustment',
      lines: [
        { account_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', description: '', debit: 0, credit: 0 }
      ]
    });
  };

  const postJournalEntry = async (entryId) => {
    try {
      await api.post(`/accounting/journal-entries/${entryId}/post`);
      toast.success('Journal entry posted');
      loadJournalEntries();
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to post entry');
    }
  };

  const voidJournalEntry = async (entryId) => {
    try {
      await api.post(`/accounting/journal-entries/${entryId}/void`);
      toast.success('Journal entry voided');
      loadJournalEntries();
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to void entry');
    }
  };

  const deleteJournalEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/accounting/journal-entries/${entryId}`);
      toast.success('Journal entry deleted');
      loadJournalEntries();
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete entry');
    }
  };

  const addJournalLine = () => {
    setJournalForm({
      ...journalForm,
      lines: [...journalForm.lines, { account_id: '', description: '', debit: 0, credit: 0 }]
    });
  };

  const updateJournalLine = (index, field, value) => {
    const newLines = [...journalForm.lines];
    newLines[index][field] = value;
    setJournalForm({ ...journalForm, lines: newLines });
  };

  const removeJournalLine = (index) => {
    if (journalForm.lines.length <= 2) return;
    const newLines = journalForm.lines.filter((_, i) => i !== index);
    setJournalForm({ ...journalForm, lines: newLines });
  };

  const syncInvoices = async () => {
    try {
      const res = await api.post('/accounting/sync-invoices');
      toast.success(res.data.message);
      loadAR();
    } catch (err) {
      toast.error('Failed to sync invoices');
    }
  };

  const syncPayroll = async (payrollId) => {
    try {
      const res = await api.post(`/accounting/sync-payroll?payroll_id=${payrollId}`);
      if (res.data.success !== false) {
        toast.success(res.data.message || 'Nómina sincronizada');
        loadDashboard();
        loadJournalEntries();
      } else {
        toast.info(res.data.message);
      }
    } catch (err) {
      toast.error('Error al sincronizar nómina');
    }
  };

  const syncAllPayroll = async () => {
    try {
      // Get all unsynced payroll runs
      const payrollRes = await api.get('/payroll/history');
      const payrollRuns = payrollRes.data || [];
      
      let synced = 0;
      for (const run of payrollRuns) {
        if (!run.accounting_synced) {
          const res = await api.post(`/accounting/sync-payroll?payroll_id=${run.id}`);
          if (res.data.success) synced++;
        }
      }
      
      if (synced > 0) {
        toast.success(`${synced} nóminas sincronizadas a contabilidad`);
        loadDashboard();
        loadJournalEntries();
      } else {
        toast.info('Todas las nóminas ya están sincronizadas');
      }
    } catch (err) {
      toast.error('Error al sincronizar nóminas');
    }
  };

  const syncPurchaseOrders = async () => {
    try {
      const res = await api.post('/accounting/sync-purchase-orders');
      toast.success(res.data.message);
      loadAP();
      loadDashboard();
    } catch (err) {
      toast.error('Error al sincronizar órdenes de compra');
    }
  };

  const loadCashFlow = async () => {
    setLoadingCashFlow(true);
    try {
      const res = await api.get('/accounting/cash-flow-projection');
      setCashFlowData(res.data);
    } catch (err) {
      console.error('Error loading cash flow:', err);
    } finally {
      setLoadingCashFlow(false);
    }
  };

  const migrateHistoricalData = async () => {
    setMigrating(true);
    try {
      const res = await api.post('/accounting/migrate-historical-data?year=2026');
      toast.success(res.data.message, {
        description: `Facturas: ${res.data.results.invoices.synced}, POs: ${res.data.results.purchase_orders.synced}, Nóminas: ${res.data.results.payroll_runs.synced}, Gastos: ${res.data.results.expenses.synced}`
      });
      loadDashboard();
      loadJournalEntries();
      loadAR();
      loadAP();
      loadCashFlow();
    } catch (err) {
      toast.error('Error en migración de datos');
    } finally {
      setMigrating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-purple-100 text-purple-800',
      revenue: 'bg-green-100 text-green-800',
      expense: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800',
      posted: 'bg-green-100 text-green-800',
      voided: 'bg-red-100 text-red-800',
      open: 'bg-blue-100 text-blue-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const accountSubtypes = {
    asset: ['cash', 'accounts_receivable', 'inventory', 'fixed_assets', 'other_assets'],
    liability: ['accounts_payable', 'payroll_liabilities', 'taxes_payable', 'loans', 'other_liabilities'],
    equity: ['owners_equity', 'retained_earnings'],
    revenue: ['sales', 'service_revenue', 'other_income'],
    expense: ['cost_of_goods', 'payroll_expense', 'tax_expense', 'operating_expense', 'other_expense']
  };

  // Dashboard Tab
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={syncInvoices}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sincronizar Facturas
        </Button>
        <Button variant="outline" size="sm" onClick={syncAllPayroll}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sincronizar Nóminas
        </Button>
        <Button variant="outline" size="sm" onClick={syncPurchaseOrders}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sincronizar Órdenes de Compra
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={migrateHistoricalData}
          disabled={migrating}
          className="bg-green-600 hover:bg-green-700"
        >
          {migrating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Migrar Data 2026
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Assets</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboard?.summary?.total_assets)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Landmark className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Liabilities</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(dashboard?.summary?.total_liabilities)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <CreditCard className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Worth</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboard?.summary?.net_worth)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <PiggyBank className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Income</p>
                <p className={`text-2xl font-bold ${(dashboard?.summary?.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboard?.summary?.net_income)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${(dashboard?.summary?.net_income || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {(dashboard?.summary?.net_income || 0) >= 0 ? 
                  <TrendingUp className="w-6 h-6 text-green-600" /> : 
                  <TrendingDown className="w-6 h-6 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              Accounts Receivable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(dashboard?.receivables?.total_outstanding)}
            </p>
            <p className="text-sm text-gray-500">Outstanding</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-600" />
              Accounts Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(dashboard?.payables?.total_outstanding)}
            </p>
            <p className="text-sm text-gray-500">Outstanding</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              Tax Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(dashboard?.tax_liabilities?.total_pending)}
            </p>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Journal Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.recent_entries?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Memo</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recent_entries.slice(0, 5).map((entry) => (
                  <TableRow key={entry.entry_id}>
                    <TableCell>{moment(entry.entry_date).format('MM/DD/YYYY')}</TableCell>
                    <TableCell>#{entry.entry_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.memo}</TableCell>
                    <TableCell>{formatCurrency(entry.total_debit)}</TableCell>
                    <TableCell>{formatCurrency(entry.total_credit)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(entry.status)}>{entry.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-4">No journal entries yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Cash Flow Projection Tab
  const renderCashFlow = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Proyección de Flujo de Caja</h2>
          <p className="text-sm text-gray-500">Visibilidad de ingresos y egresos proyectados a 30, 60 y 90 días</p>
        </div>
        <Button variant="outline" onClick={loadCashFlow} disabled={loadingCashFlow}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingCashFlow ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {cashFlowData ? (
        <>
          {/* Current Balance */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Balance Actual en Caja</p>
                  <p className="text-3xl font-bold">{formatCurrency(cashFlowData.current_cash_balance)}</p>
                </div>
                <Landmark className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          {/* Projection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(cashFlowData.projection || {}).map(([key, period]) => (
              <Card key={key} className={period.status === 'negative' ? 'border-red-200' : 'border-green-200'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{period.period?.replace('_', ' ').replace('days', 'días')}</span>
                    <Badge className={period.status === 'negative' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {period.status === 'negative' ? 'Déficit' : 'Superávit'}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-gray-500">Hasta {period.date}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm text-green-700 flex items-center">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      Entradas (AR)
                    </span>
                    <span className="font-semibold text-green-700">{formatCurrency(period.inflows?.total)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm text-red-700 flex items-center">
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                      Salidas (AP + Impuestos)
                    </span>
                    <span className="font-semibold text-red-700">{formatCurrency(period.outflows?.total)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Flujo Neto</span>
                      <span className={`text-lg font-bold ${period.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(period.net_cash_flow)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Cuentas por Cobrar</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(cashFlowData.total_ar_outstanding)}</p>
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Cuentas por Pagar</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(cashFlowData.total_ap_outstanding)}</p>
                  </div>
                  <ArrowDownRight className="w-8 h-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Impuestos Pendientes</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(cashFlowData.total_tax_liabilities)}</p>
                  </div>
                  <Receipt className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aging Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                  Antigüedad de Cuentas por Cobrar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm">Corriente (0-30 días)</span>
                    <span className="font-semibold">{formatCurrency(cashFlowData.ar_aging?.current)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="text-sm">30-60 días</span>
                    <span className="font-semibold">{formatCurrency(cashFlowData.ar_aging?.['30_60'])}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="text-sm">60-90 días</span>
                    <span className="font-semibold">{formatCurrency(cashFlowData.ar_aging?.['60_90'])}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm">Más de 90 días / Vencidas</span>
                    <span className="font-semibold text-red-600">{formatCurrency(cashFlowData.ar_aging?.over_90)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                  Antigüedad de Cuentas por Pagar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm">Corriente (0-30 días)</span>
                    <span className="font-semibold">{formatCurrency(cashFlowData.ap_aging?.current)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="text-sm">30-60 días</span>
                    <span className="font-semibold">{formatCurrency(cashFlowData.ap_aging?.['30_60'])}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="text-sm">60-90 días</span>
                    <span className="font-semibold">{formatCurrency(cashFlowData.ap_aging?.['60_90'])}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm">Más de 90 días / Vencidas</span>
                    <span className="font-semibold text-red-600">{formatCurrency(cashFlowData.ap_aging?.over_90)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            {loadingCashFlow ? 'Cargando proyección...' : 'No hay datos disponibles'}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Chart of Accounts Tab
  const renderChartOfAccounts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button variant="outline" onClick={seedDefaultAccounts}>
              <Plus className="w-4 h-4 mr-2" />
              Seed Default Accounts
            </Button>
          )}
          <Button onClick={() => setAccountDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account #</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.account_id}>
                  <TableCell className="font-mono">{account.account_number}</TableCell>
                  <TableCell className="font-medium">{account.account_name}</TableCell>
                  <TableCell>
                    <Badge className={getAccountTypeColor(account.account_type)}>
                      {account.account_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {account.account_subtype?.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(account.balance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.is_active ? 'default' : 'secondary'}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>Add a new account to your chart of accounts</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Number</Label>
                <Input
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  placeholder="e.g., 1000"
                />
              </div>
              <div>
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  value={accountForm.opening_balance}
                  onChange={(e) => setAccountForm({ ...accountForm, opening_balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Account Name</Label>
              <Input
                value={accountForm.account_name}
                onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                placeholder="e.g., Cash"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Type</Label>
                <Select
                  value={accountForm.account_type}
                  onValueChange={(value) => setAccountForm({ 
                    ...accountForm, 
                    account_type: value,
                    account_subtype: accountSubtypes[value][0]
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subtype</Label>
                <Select
                  value={accountForm.account_subtype}
                  onValueChange={(value) => setAccountForm({ ...accountForm, account_subtype: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountSubtypes[accountForm.account_type]?.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={accountForm.description}
                onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>Cancel</Button>
            <Button onClick={createAccount}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Journal Entries Tab
  const renderJournalEntries = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Journal Entries</h2>
        <Button onClick={() => setJournalDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entry #</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.map((entry) => (
                <TableRow key={entry.entry_id}>
                  <TableCell>{moment(entry.entry_date).format('MM/DD/YYYY')}</TableCell>
                  <TableCell>#{entry.entry_number}</TableCell>
                  <TableCell>{entry.reference || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{entry.memo}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(entry.total_debit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(entry.total_credit)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(entry.status)}>{entry.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {entry.status === 'draft' && (
                          <DropdownMenuItem onClick={() => postJournalEntry(entry.entry_id)}>
                            <Check className="w-4 h-4 mr-2" />
                            Post Entry
                          </DropdownMenuItem>
                        )}
                        {entry.status !== 'voided' && (
                          <DropdownMenuItem onClick={() => voidJournalEntry(entry.entry_id)}>
                            <X className="w-4 h-4 mr-2" />
                            Void Entry
                          </DropdownMenuItem>
                        )}
                        {entry.status === 'draft' && (
                          <DropdownMenuItem 
                            onClick={() => deleteJournalEntry(entry.entry_id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Entry
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Journal Entry Dialog */}
      <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
            <DialogDescription>Debits must equal credits</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={journalForm.entry_date}
                  onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Reference</Label>
                <Input
                  value={journalForm.reference}
                  onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={journalForm.transaction_type}
                  onValueChange={(value) => setJournalForm({ ...journalForm, transaction_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                    <SelectItem value="tax_payment">Tax Payment</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Memo</Label>
              <Input
                value={journalForm.memo}
                onChange={(e) => setJournalForm({ ...journalForm, memo: e.target.value })}
                placeholder="Description of entry"
              />
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-semibold">Entry Lines</Label>
                <Button variant="outline" size="sm" onClick={addJournalLine}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Line
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px]">Debit</TableHead>
                    <TableHead className="w-[120px]">Credit</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalForm.lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={line.account_id}
                          onValueChange={(value) => updateJournalLine(index, 'account_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.account_id} value={acc.account_id}>
                                {acc.account_number} - {acc.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateJournalLine(index, 'description', e.target.value)}
                          placeholder="Line description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.debit || ''}
                          onChange={(e) => updateJournalLine(index, 'debit', parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.credit || ''}
                          onChange={(e) => updateJournalLine(index, 'credit', parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJournalLine(index)}
                          disabled={journalForm.lines.length <= 2}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4 gap-8 text-sm">
                <div>
                  <span className="text-gray-500">Total Debit:</span>
                  <span className="ml-2 font-mono font-semibold">
                    {formatCurrency(journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Total Credit:</span>
                  <span className="ml-2 font-mono font-semibold">
                    {formatCurrency(journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJournalDialogOpen(false)}>Cancel</Button>
            <Button onClick={createJournalEntry}>Create Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // AR Tab
  const renderAR = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Accounts Receivable</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncInvoices}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Invoices
          </Button>
          <Button onClick={() => setArDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add AR
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(arList.filter(a => a.status !== 'paid').reduce((sum, a) => sum + a.balance, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(arList.filter(a => a.status !== 'paid' && moment(a.due_date).isBefore(moment())).reduce((sum, a) => sum + a.balance, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Collected This Month</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(arList.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.amount_paid, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arList.map((ar) => (
                <TableRow key={ar.ar_id}>
                  <TableCell className="font-medium">{ar.customer_name}</TableCell>
                  <TableCell>{ar.invoice_number || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{ar.description}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(ar.amount)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(ar.amount_paid)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(ar.balance)}</TableCell>
                  <TableCell className={moment(ar.due_date).isBefore(moment()) && ar.status !== 'paid' ? 'text-red-600' : ''}>
                    {moment(ar.due_date).format('MM/DD/YYYY')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(ar.status)}>{ar.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // AP Tab
  const renderAP = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Accounts Payable</h2>
        <Button onClick={() => setApDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add AP
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(apList.filter(a => a.status !== 'paid').reduce((sum, a) => sum + a.balance, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Due This Week</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(apList.filter(a => a.status !== 'paid' && moment(a.due_date).isBefore(moment().add(7, 'days'))).reduce((sum, a) => sum + a.balance, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Paid This Month</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(apList.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.amount_paid, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apList.map((ap) => (
                <TableRow key={ap.ap_id}>
                  <TableCell className="font-medium">{ap.vendor_name}</TableCell>
                  <TableCell>{ap.bill_number || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{ap.description}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(ap.amount)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(ap.amount_paid)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(ap.balance)}</TableCell>
                  <TableCell className={moment(ap.due_date).isBefore(moment()) && ap.status !== 'paid' ? 'text-red-600' : ''}>
                    {moment(ap.due_date).format('MM/DD/YYYY')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(ap.status)}>{ap.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Tax Reports Tab
  const renderTaxes = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Tax Management</h2>
      
      {/* Tax Rates Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax Rates Reference (US & Puerto Rico)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-blue-800">PR IVU (Sales Tax)</p>
              <p className="text-2xl font-bold text-blue-600">11.5%</p>
              <p className="text-xs text-blue-600">10.5% State + 1% Municipal</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-semibold text-green-800">Social Security (FICA)</p>
              <p className="text-2xl font-bold text-green-600">6.2%</p>
              <p className="text-xs text-green-600">Employee + Employer</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-semibold text-purple-800">Medicare (FICA)</p>
              <p className="text-2xl font-bold text-purple-600">1.45%</p>
              <p className="text-xs text-purple-600">Employee + Employer</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-semibold text-orange-800">FUTA</p>
              <p className="text-2xl font-bold text-orange-600">6.0%</p>
              <p className="text-xs text-orange-600">First $7,000 wages</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-semibold text-red-800">PR Incapacidad (SINOT)</p>
              <p className="text-2xl font-bold text-red-600">0.40%</p>
              <p className="text-xs text-red-600">Patronal</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg">
              <p className="text-sm font-semibold text-teal-800">PR Desempleo</p>
              <p className="text-2xl font-bold text-teal-600">3.40%</p>
              <p className="text-xs text-teal-600">Patronal</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800">PR Choferil</p>
              <p className="text-2xl font-bold text-yellow-600">0.25%</p>
              <p className="text-xs text-yellow-600">Patronal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Liabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax Liabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {taxLiabilities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxLiabilities.map((liability) => (
                  <TableRow key={liability.liability_id}>
                    <TableCell className="font-medium">{liability.tax_type}</TableCell>
                    <TableCell>{liability.period_start} to {liability.period_end}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(liability.amount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(liability.amount_paid)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(liability.balance)}</TableCell>
                    <TableCell>{moment(liability.due_date).format('MM/DD/YYYY')}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(liability.status)}>{liability.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-4">No tax liabilities recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Financial Reports Tab
  const renderReports = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Financial Reports</h2>
      
      <Tabs defaultValue="trial-balance" className="w-full">
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="form-941">Form 941</TabsTrigger>
          <TabsTrigger value="form-940">Form 940</TabsTrigger>
          <TabsTrigger value="ivu-pr">PR IVU</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Trial Balance</span>
                {trialBalance && (
                  <Badge className={trialBalance.is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {trialBalance.is_balanced ? 'Balanced' : 'Out of Balance'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>As of {trialBalance?.as_of_date}</CardDescription>
            </CardHeader>
            <CardContent>
              {trialBalance?.accounts?.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account #</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.accounts.map((account, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{account.account_number}</TableCell>
                          <TableCell>{account.account_name}</TableCell>
                          <TableCell>
                            <Badge className={getAccountTypeColor(account.account_type)}>
                              {account.account_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {account.debit > 0 ? formatCurrency(account.debit) : ''}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {account.credit > 0 ? formatCurrency(account.credit) : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-gray-50">
                        <TableCell colSpan={3}>TOTALS</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(trialBalance.total_debits)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(trialBalance.total_credits)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Balance Sheet</span>
                {balanceSheet && (
                  <Badge className={balanceSheet.is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {balanceSheet.is_balanced ? 'Balanced' : 'Out of Balance'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>As of {balanceSheet?.as_of_date}</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceSheet ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assets */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-blue-800">ASSETS</h3>
                    {balanceSheet.assets?.map((asset, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{asset.account_number} - {asset.account_name}</span>
                        <span className="font-mono">{formatCurrency(asset.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-blue-800 border-t-2 mt-2">
                      <span>Total Assets</span>
                      <span className="font-mono">{formatCurrency(balanceSheet.total_assets)}</span>
                    </div>
                  </div>
                  
                  {/* Liabilities & Equity */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-red-800">LIABILITIES</h3>
                    {balanceSheet.liabilities?.map((liability, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{liability.account_number} - {liability.account_name}</span>
                        <span className="font-mono">{formatCurrency(liability.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-red-800 border-t-2 mt-2">
                      <span>Total Liabilities</span>
                      <span className="font-mono">{formatCurrency(balanceSheet.total_liabilities)}</span>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-3 mt-6 text-purple-800">EQUITY</h3>
                    {balanceSheet.equity?.map((eq, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{eq.account_number} - {eq.account_name}</span>
                        <span className="font-mono">{formatCurrency(eq.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-purple-800 border-t-2 mt-2">
                      <span>Total Equity</span>
                      <span className="font-mono">{formatCurrency(balanceSheet.total_equity)}</span>
                    </div>
                    
                    <div className="flex justify-between py-3 font-bold text-lg border-t-4 mt-4">
                      <span>Total Liabilities & Equity</span>
                      <span className="font-mono">{formatCurrency(balanceSheet.total_liabilities + balanceSheet.total_equity)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income-statement">
          <Card>
            <CardHeader>
              <CardTitle>Income Statement (Profit & Loss)</CardTitle>
              <CardDescription>
                {incomeStatement?.period_start} to {incomeStatement?.period_end}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incomeStatement ? (
                <div className="space-y-6">
                  {/* Revenue */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-green-800">REVENUE</h3>
                    {incomeStatement.revenue?.map((rev, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{rev.account_number} - {rev.account_name}</span>
                        <span className="font-mono">{formatCurrency(rev.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-green-800 border-t-2 mt-2">
                      <span>Total Revenue</span>
                      <span className="font-mono">{formatCurrency(incomeStatement.total_revenue)}</span>
                    </div>
                  </div>

                  {/* COGS */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-orange-800">COST OF GOODS SOLD</h3>
                    {incomeStatement.cost_of_goods_sold?.map((cog, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{cog.account_number} - {cog.account_name}</span>
                        <span className="font-mono">{formatCurrency(cog.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-orange-800 border-t-2 mt-2">
                      <span>Total COGS</span>
                      <span className="font-mono">{formatCurrency(incomeStatement.total_cost_of_goods_sold)}</span>
                    </div>
                  </div>

                  {/* Gross Profit */}
                  <div className="flex justify-between py-3 font-bold text-lg bg-blue-50 px-4 rounded">
                    <span>GROSS PROFIT</span>
                    <span className="font-mono">{formatCurrency(incomeStatement.gross_profit)}</span>
                  </div>

                  {/* Operating Expenses */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-red-800">OPERATING EXPENSES</h3>
                    {incomeStatement.expenses?.map((exp, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{exp.account_number} - {exp.account_name}</span>
                        <span className="font-mono">{formatCurrency(exp.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-red-800 border-t-2 mt-2">
                      <span>Total Expenses</span>
                      <span className="font-mono">{formatCurrency(incomeStatement.total_expenses)}</span>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className={`flex justify-between py-4 font-bold text-xl px-4 rounded ${incomeStatement.net_income >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <span>NET INCOME</span>
                    <span className="font-mono">{formatCurrency(incomeStatement.net_income)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form-941">
          <Card>
            <CardHeader>
              <CardTitle>Form 941 - Quarterly Federal Tax Return</CardTitle>
              <CardDescription>Q{form941Data?.quarter} {form941Data?.year}</CardDescription>
            </CardHeader>
            <CardContent>
              {form941Data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Line 2: Total Wages</p>
                      <p className="text-xl font-bold">{formatCurrency(form941Data.line_2_wages)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Line 3: Federal Withholding</p>
                      <p className="text-xl font-bold">{formatCurrency(form941Data.line_3_federal_withholding)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Line 5a: Social Security Tax</p>
                      <p className="text-xl font-bold">{formatCurrency(form941Data.line_5a_social_security_tax)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Line 5c: Medicare Tax</p>
                      <p className="text-xl font-bold">{formatCurrency(form941Data.line_5c_medicare_tax)}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-500">Line 6: Total Taxes</p>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(form941Data.line_6_total_taxes)}</p>
                  </div>
                  <p className="text-sm text-gray-500 italic">{form941Data.note}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form-940">
          <Card>
            <CardHeader>
              <CardTitle>Form 940 - FUTA Annual Return</CardTitle>
              <CardDescription>Year {form940Data?.year}</CardDescription>
            </CardHeader>
            <CardContent>
              {form940Data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">FUTA Wage Base</p>
                      <p className="text-xl font-bold">{formatCurrency(form940Data.futa_wage_base)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">FUTA Rate</p>
                      <p className="text-xl font-bold">{(form940Data.futa_rate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Total FUTA Liability</p>
                      <p className="text-xl font-bold">{formatCurrency(form940Data.total_futa_liability)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Payments Made</p>
                      <p className="text-xl font-bold">{formatCurrency(form940Data.payments_made)}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-500">Balance Due</p>
                    <p className="text-2xl font-bold text-orange-800">{formatCurrency(form940Data.balance_due)}</p>
                  </div>
                  <p className="text-sm text-gray-500 italic">{form940Data.note}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ivu-pr">
          <Card>
            <CardHeader>
              <CardTitle>Puerto Rico IVU Report</CardTitle>
              <CardDescription>Period: {ivuData?.period}</CardDescription>
            </CardHeader>
            <CardContent>
              {ivuData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-500">IVU Rate Breakdown</p>
                    <div className="flex gap-4 mt-2">
                      <span className="font-semibold">State: {(ivuData.ivu_rate_breakdown?.state * 100).toFixed(1)}%</span>
                      <span className="font-semibold">Municipal: {(ivuData.ivu_rate_breakdown?.municipal * 100).toFixed(1)}%</span>
                      <span className="font-bold text-blue-800">Total: {(ivuData.ivu_rate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Estimated Taxable Sales</p>
                      <p className="text-xl font-bold">{formatCurrency(ivuData.estimated_taxable_sales)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Total IVU Collected</p>
                      <p className="text-xl font-bold">{formatCurrency(ivuData.total_ivu_collected)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Payments Made</p>
                      <p className="text-xl font-bold">{formatCurrency(ivuData.payments_made)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Due Date</p>
                      <p className="text-xl font-bold">{moment(ivuData.due_date).format('MM/DD/YYYY')}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-500">Balance Due</p>
                    <p className="text-2xl font-bold text-green-800">{formatCurrency(ivuData.balance_due)}</p>
                  </div>
                  <p className="text-sm text-gray-500 italic">{ivuData.note}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
            <p className="text-sm text-gray-500">US & Puerto Rico Compliant Financial Management</p>
          </div>
          <Button variant="outline" onClick={loadDashboard}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex-wrap h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="coa" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Chart of Accounts
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Journal Entries
            </TabsTrigger>
            <TabsTrigger value="ar" className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Receivables
            </TabsTrigger>
            <TabsTrigger value="ap" className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4" />
              Payables
            </TabsTrigger>
            <TabsTrigger value="taxes" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Taxes
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Cash Flow
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {renderDashboard()}
          </TabsContent>
          <TabsContent value="coa" className="mt-6">
            {renderChartOfAccounts()}
          </TabsContent>
          <TabsContent value="journal" className="mt-6">
            {renderJournalEntries()}
          </TabsContent>
          <TabsContent value="ar" className="mt-6">
            {renderAR()}
          </TabsContent>
          <TabsContent value="ap" className="mt-6">
            {renderAP()}
          </TabsContent>
          <TabsContent value="taxes" className="mt-6">
            {renderTaxes()}
          </TabsContent>
          <TabsContent value="cashflow" className="mt-6">
            {renderCashFlow()}
          </TabsContent>
          <TabsContent value="reports" className="mt-6">
            {renderReports()}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Accounting;
