/**
 * i18n.js — Japanese / English translations
 */

const translations = {
  ja: {
    title: 'ローン計算機',
    subtitle: '住宅ローン・カーローン・教育ローンに対応',
    // Input labels
    principal: '借入金額',
    apr: '年利率 (APR)',
    termYears: '返済期間（年）',
    termMonths: '返済期間（月）',
    startDate: '返済開始日',
    paymentType: '返済方式',
    equalInstallment: '元利均等返済',
    equalPrincipal: '元金均等返済',
    extraPayment: '毎月の繰上返済額',
    currency: '通貨',
    calculate: '計算する',
    reset: 'リセット',
    // Result cards
    monthlyPayment: '毎月の返済額',
    firstPayment: '初回返済額',
    totalPayment: '返済総額',
    totalInterest: '利息総額',
    interestRatio: '利息の割合',
    loanTerm: '返済期間',
    months: 'ヶ月',
    years: '年',
    // Early payoff
    earlyPayoffTitle: '繰上返済効果',
    newTerm: '短縮後の返済期間',
    interestSaved: '節約できる利息',
    termReduced: '期間の短縮',
    // Chart
    chartTitle: '元本・利息の内訳',
    principal_label: '元本',
    interest_label: '利息',
    // Table
    tableTitle: '償還予定表',
    colMonth: '月',
    colPayment: '返済額',
    colPrincipal: '元本',
    colInterest: '利息',
    colBalance: '残高',
    showAll: 'すべて表示',
    showLess: '折りたたむ',
    page: 'ページ',
    of: '/',
    prev: '前へ',
    next: '次へ',
    // Theme
    darkMode: 'ダークモード',
    lightMode: 'ライトモード',
    // Language
    lang: 'English',
    // Units
    yen: '円',
    percent: '%',
    // Errors
    errPrincipal: '借入金額を入力してください',
    errApr: '年利率を入力してください',
    errTerm: '返済期間を入力してください',
    errPositive: '正の値を入力してください',
  },
  en: {
    title: 'Loan Calculator',
    subtitle: 'Mortgage, car loan, and personal loan calculator',
    principal: 'Principal',
    apr: 'Annual Rate (APR)',
    termYears: 'Term (years)',
    termMonths: 'Term (months)',
    startDate: 'Start Date',
    paymentType: 'Payment Type',
    equalInstallment: 'Equal Installments',
    equalPrincipal: 'Equal Principal',
    extraPayment: 'Extra Monthly Payment',
    currency: 'Currency',
    calculate: 'Calculate',
    reset: 'Reset',
    monthlyPayment: 'Monthly Payment',
    firstPayment: 'First Payment',
    totalPayment: 'Total Payment',
    totalInterest: 'Total Interest',
    interestRatio: 'Interest Ratio',
    loanTerm: 'Loan Term',
    months: 'months',
    years: 'years',
    earlyPayoffTitle: 'Prepayment Effect',
    newTerm: 'New Term',
    interestSaved: 'Interest Saved',
    termReduced: 'Term Reduced',
    chartTitle: 'Principal vs Interest',
    principal_label: 'Principal',
    interest_label: 'Interest',
    tableTitle: 'Amortization Schedule',
    colMonth: 'Month',
    colPayment: 'Payment',
    colPrincipal: 'Principal',
    colInterest: 'Interest',
    colBalance: 'Balance',
    showAll: 'Show All',
    showLess: 'Collapse',
    page: 'Page',
    of: 'of',
    prev: 'Prev',
    next: 'Next',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    lang: '日本語',
    yen: '¥',
    percent: '%',
    errPrincipal: 'Enter the principal amount',
    errApr: 'Enter the annual interest rate',
    errTerm: 'Enter the loan term',
    errPositive: 'Please enter a positive value',
  },
};

let currentLang = 'ja';

export function setLang(lang) {
  if (translations[lang]) currentLang = lang;
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  return translations[currentLang][key] ?? translations['en'][key] ?? key;
}

export function getCurrencyForLang() {
  return currentLang === 'ja' ? 'JPY' : 'USD';
}
