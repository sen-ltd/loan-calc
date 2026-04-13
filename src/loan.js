/**
 * loan.js — Core loan / mortgage math
 *
 * Supports:
 *   - Equal installments  (元利均等返済)
 *   - Equal principal      (元金均等返済)
 *   - Extra payment simulation
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a number as currency string.
 * @param {number} amount
 * @param {'JPY'|'USD'} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'JPY') {
  return new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount);
}

// ─── equal installments (元利均等) ────────────────────────────────────────────

/**
 * Calculate the fixed monthly payment for an equal-installment loan.
 * @param {number} principal  Loan amount
 * @param {number} apr        Annual percentage rate (0.05 = 5%)
 * @param {number} months     Loan term in months
 * @returns {number}
 */
export function monthlyPayment(principal, apr, months) {
  if (principal <= 0 || months <= 0) return 0;
  if (apr === 0) return principal / months;
  const r = apr / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

// ─── amortization schedule ────────────────────────────────────────────────────

/**
 * Generate full amortization schedule.
 * @param {number} principal
 * @param {number} apr
 * @param {number} months
 * @param {'equal-installment'|'equal-principal'} type
 * @returns {Array<{month:number, payment:number, principalPaid:number, interestPaid:number, balance:number}>}
 */
export function amortizationSchedule(principal, apr, months, type = 'equal-installment') {
  const r = apr / 12;
  const schedule = [];
  let balance = principal;

  if (type === 'equal-installment') {
    const payment = monthlyPayment(principal, apr, months);
    for (let m = 1; m <= months; m++) {
      const interestPaid = balance * r;
      let principalPaid = payment - interestPaid;
      if (m === months || principalPaid >= balance) {
        principalPaid = balance;
        balance = 0;
      } else {
        balance -= principalPaid;
      }
      schedule.push({
        month: m,
        payment: principalPaid + interestPaid,
        principalPaid,
        interestPaid,
        balance,
      });
      if (balance <= 0) break;
    }
  } else {
    // equal-principal (元金均等)
    const principalPerMonth = principal / months;
    for (let m = 1; m <= months; m++) {
      const interestPaid = balance * r;
      let principalPaid = principalPerMonth;
      if (m === months || principalPaid >= balance) {
        principalPaid = balance;
        balance = 0;
      } else {
        balance -= principalPaid;
      }
      schedule.push({
        month: m,
        payment: principalPaid + interestPaid,
        principalPaid,
        interestPaid,
        balance,
      });
      if (balance <= 0) break;
    }
  }

  return schedule;
}

// ─── totals ───────────────────────────────────────────────────────────────────

/**
 * Total interest paid over the life of the loan.
 * @param {number} principal
 * @param {number} apr
 * @param {number} months
 * @param {'equal-installment'|'equal-principal'} type
 * @returns {number}
 */
export function totalInterest(principal, apr, months, type = 'equal-installment') {
  const schedule = amortizationSchedule(principal, apr, months, type);
  return schedule.reduce((sum, row) => sum + row.interestPaid, 0);
}

// ─── early payoff simulation ──────────────────────────────────────────────────

/**
 * Simulate the effect of an extra monthly payment on top of the regular payment.
 * Applies additional principal reduction each month.
 *
 * @param {Array} schedule  Original amortization schedule (from amortizationSchedule())
 * @param {number} extraMonthly  Additional amount applied to principal each month
 * @returns {{ newTerm: number, interestSaved: number, newSchedule: Array }}
 */
export function earlyPayoff(schedule, extraMonthly) {
  if (!schedule.length) return { newTerm: 0, interestSaved: 0, newSchedule: [] };
  if (extraMonthly <= 0) {
    return { newTerm: schedule.length, interestSaved: 0, newSchedule: schedule };
  }

  // Derive monthly rate from first row: interest = balance_start * r
  // balance_start of month 1 = balance[0] + principalPaid[0]
  const row0 = schedule[0];
  const originalPrincipal = row0.balance + row0.principalPaid;
  const r = originalPrincipal > 0 ? row0.interestPaid / originalPrincipal : 0;

  // Detect type: equal-installment has fixed payment, equal-principal has fixed principal portion
  // We re-simulate using the per-month principal from original schedule + extra
  const originalInterest = schedule.reduce((s, row) => s + row.interestPaid, 0);

  const newSchedule = [];
  let balance = originalPrincipal;

  for (let i = 0; i < schedule.length; i++) {
    if (balance <= 0) break;
    const interestPaid = balance * r;
    // Base principal portion from original schedule
    const basePrincipal = schedule[i].principalPaid;
    let principalPaid = basePrincipal + extraMonthly;
    if (principalPaid >= balance) principalPaid = balance;
    balance -= principalPaid;
    if (balance < 0) balance = 0;
    newSchedule.push({
      month: i + 1,
      payment: principalPaid + interestPaid,
      principalPaid,
      interestPaid,
      balance,
    });
    if (balance <= 0) break;
  }

  const newInterest = newSchedule.reduce((s, row) => s + row.interestPaid, 0);
  return {
    newTerm: newSchedule.length,
    interestSaved: originalInterest - newInterest,
    newSchedule,
  };
}

/**
 * Simulate prepayment given raw loan parameters.
 * @param {number} principal
 * @param {number} apr
 * @param {number} months
 * @param {number} extraMonthly
 * @param {'equal-installment'|'equal-principal'} type
 * @returns {{ newTerm: number, interestSaved: number }}
 */
export function earlyPayoffFromParams(principal, apr, months, extraMonthly, type = 'equal-installment') {
  if (extraMonthly <= 0) {
    return { newTerm: months, interestSaved: 0 };
  }
  const r = apr / 12;
  const basePayment = type === 'equal-installment'
    ? monthlyPayment(principal, apr, months)
    : null;
  const principalPerMonth = type === 'equal-principal' ? principal / months : null;

  let balance = principal;
  let totalInt = 0;
  let term = 0;

  while (balance > 1e-6 && term < months * 2) {
    term++;
    const interest = balance * r;
    let principalPaid;
    if (type === 'equal-installment') {
      principalPaid = (basePayment - interest) + extraMonthly;
    } else {
      principalPaid = principalPerMonth + extraMonthly;
    }
    if (principalPaid >= balance) {
      totalInt += interest;
      balance = 0;
      break;
    }
    totalInt += interest;
    balance -= principalPaid;
  }

  const originalInterest = totalInterest(principal, apr, months, type);
  return {
    newTerm: term,
    interestSaved: originalInterest - totalInt,
  };
}
